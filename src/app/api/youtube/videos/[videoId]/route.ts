import { NextRequest, NextResponse } from 'next/server';
import { YouTubeService, calculateViralScore } from '@/services/youtube';
import { ContentFormat } from '@/types';

const youtubeService = new YouTubeService();

/**
 * GET /api/youtube/videos/[videoId] - 영상 상세 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'long') as ContentFormat;

    // 영상 상세 정보
    const [videoDetails] = await youtubeService.getVideoDetails([videoId]);

    if (!videoDetails) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    // 채널 정보
    const [channelDetails] = await youtubeService.getChannelDetails([videoDetails.channelId]);
    const subscriberCount = channelDetails?.subscriberCount || 0;

    // 터짐 지수
    const viralResult = calculateViralScore(
      videoDetails.viewCount,
      subscriberCount,
      videoDetails.publishedAt,
      format
    );

    // Duration parsing
    const durationSeconds = YouTubeService.parseDuration(videoDetails.duration);

    return NextResponse.json({
      success: true,
      data: {
        ...videoDetails,
        subscriberCount,
        durationSeconds,
        durationFormatted: YouTubeService.formatDuration(durationSeconds),
        viralScore: viralResult.score,
        viralGrade: viralResult.grade,
        timeWeight: viralResult.timeWeight,
      },
    });
  } catch (error: any) {
    console.error('Error fetching video details:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
