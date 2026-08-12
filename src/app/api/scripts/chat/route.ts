import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';
import { ContentFormat } from '@/types';

let _geminiService: GeminiService | null = null;
// 지연 생성: 초기화 실패를 모듈 로드가 아닌 핸들러 try/catch 에서 JSON 으로 응답하기 위함
const geminiService = () => {
  if (!_geminiService) _geminiService = new GeminiService();
  return _geminiService;
};

/**
 * POST /api/scripts/chat - AI 채팅 응답 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, format = 'long' } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'messages array is required' },
        { status: 400 }
      );
    }

    console.log(`Generating chat response with Gemini...`);

    const response = await geminiService().generateChatResponse(
      messages,
      format as ContentFormat
    );

    return NextResponse.json({
      success: true,
      data: {
        response,
      },
    });
  } catch (error: any) {
    console.error('Error generating chat response:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
