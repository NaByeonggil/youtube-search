import { NextRequest, NextResponse } from 'next/server';
import { YouTubeService } from '@/services/youtube';
import { ContentFormat } from '@/types';

const youtubeService = new YouTubeService();

/**
 * GET /api/youtube/comments/[videoId] - 영상 댓글 수집
 * PRD 4단계: 댓글 수집 (숏폼 50~100개, 롱폼 100~200개)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'long') as ContentFormat;

    console.log(`Fetching comments for video: ${videoId} (format: ${format})`);

    const comments = await youtubeService.getComments(videoId, format);

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        format,
        comments,
        totalCount: comments.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
