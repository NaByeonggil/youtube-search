import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/videos - 새 영상 정보 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      videoId,
      title,
      channelId,
      channelName,
      subscriberCount,
      viewCount,
      likeCount,
      commentCount,
      durationSeconds,
      publishedAt,
      thumbnailUrl,
      viralScore,
      viralGrade,
    } = body;

    if (!projectId || !videoId || !title) {
      return NextResponse.json(
        { success: false, error: 'projectId, videoId, and title are required' },
        { status: 400 }
      );
    }

    const id = await db.selectedVideos.create({
      projectId,
      videoId,
      title,
      channelId: channelId || 'unknown',
      channelName,
      subscriberCount,
      viewCount,
      likeCount,
      commentCount,
      durationSeconds,
      publishedAt: publishedAt ? new Date(publishedAt) : undefined,
      thumbnailUrl,
      viralScore,
      viralGrade,
    });

    const video = await db.selectedVideos.findById(id);

    return NextResponse.json({
      success: true,
      data: video,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
