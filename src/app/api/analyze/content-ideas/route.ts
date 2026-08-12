import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';
import { YouTubeService } from '@/services/youtube';
import { ContentFormat } from '@/types';

let _geminiService: GeminiService | null = null;
// 지연 생성: 초기화 실패를 모듈 로드가 아닌 핸들러 try/catch 에서 JSON 으로 응답하기 위함
const geminiService = () => {
  if (!_geminiService) _geminiService = new GeminiService();
  return _geminiService;
};
let _youtubeService: YouTubeService | null = null;
// 지연 생성: 초기화 실패를 모듈 로드가 아닌 핸들러 try/catch 에서 JSON 으로 응답하기 위함
const youtubeService = () => {
  if (!_youtubeService) _youtubeService = new YouTubeService();
  return _youtubeService;
};

/**
 * POST /api/analyze/content-ideas - 댓글 기반 콘텐츠 아이디어 분석
 * 영상의 댓글을 분석하여 새로운 콘텐츠 소재를 추천
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoId,
      videoTitle,
      comments,
      format = 'long'
    } = body;

    if (!videoId && !comments) {
      return NextResponse.json(
        { success: false, error: 'videoId or comments is required' },
        { status: 400 }
      );
    }

    let commentsToAnalyze = comments;

    // 직접 댓글을 전달하지 않은 경우 YouTube에서 수집
    if (!commentsToAnalyze && videoId) {
      console.log(`Fetching comments for content ideas: ${videoId}`);
      commentsToAnalyze = await youtubeService().getComments(videoId, format as ContentFormat);
    }

    if (!commentsToAnalyze || commentsToAnalyze.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No comments found to analyze' },
        { status: 400 }
      );
    }

    console.log(`Analyzing ${commentsToAnalyze.length} comments for content ideas...`);

    // Gemini로 콘텐츠 아이디어 분석
    const contentIdeas = await geminiService().analyzeContentIdeas(
      commentsToAnalyze,
      videoTitle || 'Unknown Video',
      format as ContentFormat
    );

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        videoTitle,
        format,
        totalCommentsAnalyzed: commentsToAnalyze.length,
        ...contentIdeas,
      },
    });
  } catch (error: any) {
    console.error('Error analyzing content ideas:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
