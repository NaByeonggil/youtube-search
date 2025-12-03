import { NextRequest, NextResponse } from 'next/server';
import { ClaudeService } from '@/services/claude';
import { db } from '@/lib/db';
import { ContentFormat } from '@/types';

const claudeService = new ClaudeService();

/**
 * POST /api/analyze/content - 콘텐츠 요약
 * PRD 5단계: 4단계(롱폼) 또는 2단계(숏폼) 요약
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, format = 'long', saveToDb = false, dbVideoId } = body;

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: 'transcript is required' },
        { status: 400 }
      );
    }

    console.log(`Summarizing content (format: ${format})...`);

    // Claude로 콘텐츠 요약
    const summaryResult = await claudeService.summarizeContent(
      transcript,
      format as ContentFormat
    );

    const result = {
      format,
      ...summaryResult,
    };

    // DB에 저장
    if (saveToDb && dbVideoId) {
      const summaryId = await db.contentSummaries.create({
        videoId: dbVideoId,
        originalTranscript: transcript,
        oneLineSummary: summaryResult.oneLineSummary,
        keyPoints: summaryResult.keyPoints,
        detailedSummary: summaryResult.detailedSummary,
        contextBackground: summaryResult.contextBackground,
        summaryLevel: format === 'short' ? '2-step' : '4-step',
      });

      return NextResponse.json({
        success: true,
        data: { ...result, id: summaryId },
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error summarizing content:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
