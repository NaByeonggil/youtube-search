import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface Style {
  name: string;
  en: string;
  prefix: string;
}

/**
 * POST /api/images/chat-generate - 채팅 기반 단일 이미지 생성
 * 사용자의 자유로운 프롬프트로 이미지를 생성합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, aspectRatio = '16:9', style } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: '프롬프트를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        // @ts-ignore - Gemini API supports this
        responseModalities: ['image', 'text'],
      },
    });

    // 스타일 프리픽스 적용
    const stylePrefix = style?.prefix || 'Photorealistic, ultra-detailed, professional photography style, ';

    // 최종 프롬프트 구성
    const finalPrompt = `${stylePrefix}

${prompt}

IMPORTANT RULES:
- High quality, detailed image
- Professional composition
- Clear and sharp details
- Aspect ratio: ${aspectRatio}
`;

    console.log('Generating image with prompt:', finalPrompt.slice(0, 100) + '...');

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `Generate an image with aspect ratio ${aspectRatio}: ${finalPrompt}` }]
      }],
    });

    const response = await result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        return NextResponse.json({
          success: true,
          data: {
            image: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
            prompt: prompt,
            aspectRatio: aspectRatio,
            style: style?.name || '실사',
          },
        });
      }
    }

    return NextResponse.json(
      { success: false, error: '이미지가 생성되지 않았습니다.' },
      { status: 500 }
    );

  } catch (error: any) {
    console.error('Error generating chat image:', error);
    console.error('Error details:', JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack?.slice(0, 500),
    }, null, 2));

    // Rate limit 처리
    if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { success: false, error: 'Rate limit 초과. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    // 모델 관련 에러
    if (error.message?.includes('model') || error.message?.includes('not found')) {
      return NextResponse.json(
        { success: false, error: '이미지 생성 모델을 찾을 수 없습니다. 관리자에게 문의하세요.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || '이미지 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
