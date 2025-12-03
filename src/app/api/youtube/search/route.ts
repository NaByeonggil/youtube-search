import { NextRequest, NextResponse } from 'next/server';
import { YouTubeService, calculateViralScore } from '@/services/youtube';
import { ContentFormat } from '@/types';

const youtubeService = new YouTubeService();

/**
 * GET /api/youtube/search - YouTube 키워드 검색 및 터짐 지수 계산
 * PRD 1-2단계: 영상 검색 + 터짐 지수 분석
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const format = (searchParams.get('format') || 'long') as ContentFormat;
    const maxResults = parseInt(searchParams.get('maxResults') || '50');

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'keyword is required' },
        { status: 400 }
      );
    }

    // 1. 영상 검색
    console.log(`Searching YouTube for: ${keyword} (format: ${format})`);
    const searchResults = await youtubeService.searchVideos(keyword, format, maxResults);

    if (searchResults.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No videos found',
      });
    }

    // 2. 영상 상세 정보 조회
    const videoIds = searchResults.map(v => v.videoId);
    const videoDetails = await youtubeService.getVideoDetails(videoIds);

    // 3. 채널 정보 조회 (구독자수)
    const channelIds = [...new Set(videoDetails.map(v => v.channelId))];
    const channelDetails = await youtubeService.getChannelDetails(channelIds);
    const channelMap = new Map(channelDetails.map(c => [c.channelId, c]));

    // 4. 터짐 지수 계산 및 결과 병합
    const results = videoDetails.map(video => {
      const channel = channelMap.get(video.channelId);
      const subscriberCount = channel?.subscriberCount || 0;

      const viralResult = calculateViralScore(
        video.viewCount,
        subscriberCount,
        video.publishedAt,
        format
      );

      // ISO duration to seconds
      const durationSeconds = YouTubeService.parseDuration(video.duration);
      const durationFormatted = YouTubeService.formatDuration(durationSeconds);

      return {
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        publishedAt: video.publishedAt,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        durationSeconds,
        durationFormatted,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        subscriberCount,
        viralScore: viralResult.score,
        viralGrade: viralResult.grade,
        timeWeight: viralResult.timeWeight,
      };
    });

    // 5. 터짐 지수 기준 정렬
    results.sort((a, b) => b.viralScore - a.viralScore);

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        keyword,
        format,
        totalResults: results.length,
        gradeDistribution: {
          S: results.filter(r => r.viralGrade === 'S').length,
          A: results.filter(r => r.viralGrade === 'A').length,
          B: results.filter(r => r.viralGrade === 'B').length,
          C: results.filter(r => r.viralGrade === 'C').length,
          D: results.filter(r => r.viralGrade === 'D').length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error searching YouTube:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
