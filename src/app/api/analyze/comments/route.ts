import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';
import { YouTubeService } from '@/services/youtube';
import { db } from '@/lib/db';
import { ContentFormat } from '@/types';

const geminiService = new GeminiService();
const youtubeService = new YouTubeService();

/**
 * POST /api/analyze/comments - 댓글 감성 분석
 * PRD 4단계: Gemini API로 댓글 분석
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, comments, format = 'long', saveToDb = false, dbVideoId } = body;

    let commentsToAnalyze = comments;

    // 직접 댓글을 전달하지 않은 경우 YouTube에서 수집
    if (!commentsToAnalyze && videoId) {
      console.log(`Fetching comments from YouTube: ${videoId}`);
      commentsToAnalyze = await youtubeService.getComments(videoId, format as ContentFormat);
    }

    if (!commentsToAnalyze || commentsToAnalyze.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No comments to analyze' },
        { status: 400 }
      );
    }

    console.log(`Analyzing ${commentsToAnalyze.length} comments with Gemini...`);

    // Gemini로 감성 분석
    const analysisResult = await geminiService.analyzeComments(
      commentsToAnalyze,
      format as ContentFormat
    );

    const totalCount = commentsToAnalyze.length;
    const positiveRatio = totalCount > 0
      ? (analysisResult.positiveCount / totalCount) * 100
      : 0;

    const result = {
      videoId,
      format,
      totalCommentsAnalyzed: totalCount,
      ...analysisResult,
      positiveRatio: Math.round(positiveRatio * 10) / 10,
    };

    // DB에 저장
    if (saveToDb && dbVideoId) {
      const analysisId = await db.commentAnalysis.create({
        videoId: dbVideoId,
        totalCommentsAnalyzed: totalCount,
        positiveCount: analysisResult.positiveCount,
        negativeCount: analysisResult.negativeCount,
        positiveRatio,
        positiveSummary: analysisResult.positiveSummary,
        positiveKeywords: analysisResult.positiveKeywords,
        negativeSummary: analysisResult.negativeSummary,
        negativeKeywords: analysisResult.negativeKeywords,
        improvementSuggestions: analysisResult.improvementSuggestions || '',
        rawCommentsJson: JSON.stringify(commentsToAnalyze),
        analysisModel: 'gemini-2.5-flash-preview',
      });

      return NextResponse.json({
        success: true,
        data: { ...result, id: analysisId },
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error analyzing comments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
