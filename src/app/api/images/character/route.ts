import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationService } from '@/services/imageGen';
import { GeminiService } from '@/services/gemini';
import { ContentFormat } from '@/types';

const imageService = new ImageGenerationService();
const geminiService = new GeminiService();

/**
 * POST /api/images/character - 캐릭터 이미지 생성 (채팅 기반)
 * Gemini AI로 캐릭터 설정을 분석하고, Gemini Image로 이미지 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      format = 'long',
      projectId,
      videoId,
      generateImage = false,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'messages array is required' },
        { status: 400 }
      );
    }

    // 마지막 사용자 메시지
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    if (!lastUserMessage) {
      return NextResponse.json(
        { success: false, error: 'No user message found' },
        { status: 400 }
      );
    }

    // Gemini AI로 캐릭터 정보 분석 및 응답 생성
    const systemPrompt = `당신은 유튜브 콘텐츠용 캐릭터 설정 전문가입니다.
사용자가 캐릭터에 대해 설명하면, 다음을 수행하세요:

1. 캐릭터 설정을 구체화하고 발전시켜주세요
2. 캐릭터의 외모, 성격, 특징을 상세히 설명해주세요
3. 유튜브 콘텐츠에 적합한 캐릭터인지 피드백을 주세요

응답 형식 (JSON):
{
  "response": "사용자에게 보여줄 친절한 응답 메시지",
  "character": {
    "name": "캐릭터 이름",
    "type": "캐릭터 유형 (예: 전문가, 친구, 해설자, 캐릭터)",
    "personality": "성격 특성",
    "appearance": "외모 상세 설명 (이미지 생성용)",
    "role": "콘텐츠에서의 역할",
    "voiceTone": "말투와 어조",
    "catchphrase": "특징적인 대사나 인사말"
  },
  "readyForImage": true/false (이미지 생성이 가능한 충분한 정보가 있는지)
}

항상 JSON 형식으로만 응답하세요.`;

    const chatMessages = [
      { role: 'user', content: systemPrompt },
      { role: 'assistant', content: '네, 캐릭터 설정을 도와드리겠습니다. 어떤 캐릭터를 만들고 싶으신가요?' },
      ...messages,
    ];

    const aiResponse = await geminiService.generateChatResponse(
      chatMessages,
      format as ContentFormat
    );

    // JSON 파싱 시도
    let parsedResponse;
    try {
      // JSON 블록 추출
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                       aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedResponse = JSON.parse(jsonStr);
    } catch {
      // JSON 파싱 실패시 기본 응답
      parsedResponse = {
        response: aiResponse,
        character: null,
        readyForImage: false,
      };
    }

    // 이미지 생성 요청이 있고, 캐릭터 정보가 충분한 경우
    let generatedImage = null;
    if (generateImage && parsedResponse.character && parsedResponse.readyForImage) {
      try {
        const imageResult = await imageService.generateCharacterImage(
          {
            name: parsedResponse.character.name || '캐릭터',
            type: parsedResponse.character.type || '캐릭터',
            personality: parsedResponse.character.personality || '',
            appearance: parsedResponse.character.appearance,
          },
          format as ContentFormat
        );

        // 이미지 저장 (projectId, videoId가 있는 경우)
        if (projectId && videoId && imageResult.base64) {
          const saved = await imageService.saveBase64Image(
            imageResult.base64,
            imageResult.mimeType,
            projectId,
            videoId,
            0, // character image index
            format as ContentFormat
          );
          generatedImage = {
            ...saved,
            base64: imageResult.base64,
            mimeType: imageResult.mimeType,
            revisedPrompt: imageResult.revisedPrompt,
          };
        } else {
          generatedImage = {
            base64: imageResult.base64,
            mimeType: imageResult.mimeType,
            revisedPrompt: imageResult.revisedPrompt,
          };
        }
      } catch (imageError: any) {
        console.error('Character image generation error:', imageError);
        parsedResponse.imageError = imageError.message;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: parsedResponse.response,
        character: parsedResponse.character,
        readyForImage: parsedResponse.readyForImage,
        image: generatedImage,
        model: {
          chat: 'gemini-3-pro-preview',
          image: 'gemini-3-pro-preview',
        },
      },
    });
  } catch (error: any) {
    console.error('Error in character chat:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
