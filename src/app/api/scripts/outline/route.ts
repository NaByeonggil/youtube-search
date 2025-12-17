import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';
import { ContentFormat, ContentIdeaItem } from '@/types';

const geminiService = new GeminiService();

/**
 * POST /api/scripts/outline - 대본 목차(아웃라인) 생성
 * 선택한 콘텐츠 아이디어를 바탕으로 대본 구조 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contentIdea,
      format = 'long',
      additionalContext
    } = body;

    if (!contentIdea || !contentIdea.title) {
      return NextResponse.json(
        { success: false, error: 'contentIdea with title is required' },
        { status: 400 }
      );
    }

    console.log(`Generating script outline for: ${contentIdea.title}`);

    // Gemini로 대본 목차 생성
    const outline = await geminiService.generateScriptOutline(
      contentIdea as ContentIdeaItem,
      format as ContentFormat,
      additionalContext
    );

    return NextResponse.json({
      success: true,
      data: {
        contentIdea,
        format,
        outline,
      },
    });
  } catch (error: any) {
    console.error('Error generating script outline:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
