import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';

interface ContentIdeaItem {
  id: number;
  title: string;
  description: string;
  targetAudience: string;
  estimatedViralScore: '상' | '중' | '하';
  reasoning: string;
  suggestedFormat: '숏폼' | '롱폼';
}

interface BlogGenerateRequest {
  contentIdea: ContentIdeaItem;
  additionalContext?: string;
  customTarget?: string;
  toneAndManner?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BlogGenerateRequest = await request.json();
    const { contentIdea, additionalContext, customTarget, toneAndManner } = body;

    if (!contentIdea) {
      return NextResponse.json(
        { success: false, error: '콘텐츠 아이디어가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!contentIdea.title || !contentIdea.description) {
      return NextResponse.json(
        { success: false, error: '콘텐츠 아이디어 제목과 설명이 필요합니다.' },
        { status: 400 }
      );
    }

    const gemini = new GeminiService();
    const blogPost = await gemini.generateBlogPost(contentIdea, {
      additionalContext,
      customTarget,
      toneAndManner,
    });

    return NextResponse.json({
      success: true,
      data: {
        blogPost,
        sourceIdea: {
          title: contentIdea.title,
          description: contentIdea.description,
          targetAudience: contentIdea.targetAudience,
        },
      },
    });
  } catch (error) {
    console.error('Blog generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '블로그 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
