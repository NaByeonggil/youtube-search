import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';
import { db } from '@/lib/db';
import { ContentFormat } from '@/types';

const geminiService = new GeminiService();

/**
 * POST /api/scripts/generate - 대본 생성
 * PRD 5단계: 부정 피드백 개선 대본 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      summary,
      commentAnalysis,
      format = 'long',
      targetAudience,
      saveToDb = false,
      dbVideoId,
    } = body;

    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'summary is required' },
        { status: 400 }
      );
    }

    console.log(`Generating script with Gemini (format: ${format})...`);

    // Gemini로 대본 생성
    const scriptResult = await geminiService.generateScript(
      summary.oneLineSummary || summary.topic || JSON.stringify(summary),
      format as ContentFormat,
      [],
      targetAudience,
      commentAnalysis || {}
    );

    // 글자수 계산
    const wordCount = scriptResult.fullScript?.length || 0;

    const result = {
      format,
      targetAudience,
      wordCount,
      ...scriptResult,
    };

    // DB에 저장
    if (saveToDb && dbVideoId) {
      const scriptId = await db.generatedScripts.create({
        videoId: dbVideoId,
        scriptPurpose: 'improvement',
        targetAudience: targetAudience || null,
        expectedDurationSeconds: scriptResult.estimatedDuration,
        scriptStructure: {
          hook: scriptResult.hook,
          intro: scriptResult.intro,
          body: scriptResult.body,
          conclusion: scriptResult.conclusion,
        },
        fullScript: scriptResult.fullScript,
        hookText: scriptResult.hook,
        introText: scriptResult.intro,
        bodyText: scriptResult.body,
        conclusionText: scriptResult.conclusion,
        contentFormat: format as ContentFormat,
        wordCount,
      });

      return NextResponse.json({
        success: true,
        data: { ...result, id: scriptId },
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scripts/generate/prompts - 이미지 프롬프트 생성
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, format = 'long', count } = body;

    if (!script) {
      return NextResponse.json(
        { success: false, error: 'script is required' },
        { status: 400 }
      );
    }

    console.log(`Generating image prompts with Gemini (format: ${format})...`);

    const prompts = await geminiService.generateImagePrompts(
      script,
      format as ContentFormat,
      count
    );

    return NextResponse.json({
      success: true,
      data: {
        format,
        count: prompts.length,
        prompts,
      },
    });
  } catch (error: any) {
    console.error('Error generating image prompts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
