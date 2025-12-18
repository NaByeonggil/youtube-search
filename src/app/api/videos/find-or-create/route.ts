import { NextRequest, NextResponse } from 'next/server';
import { db, query, execute, queryOne } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

const DEFAULT_PROJECT_NAME = '개별 분석';

/**
 * 기본 프로젝트 ID 가져오기 (없으면 생성)
 */
async function getOrCreateDefaultProject(): Promise<number> {
  // 기존 기본 프로젝트 찾기
  const existing = await queryOne<RowDataPacket>(
    `SELECT id FROM projects WHERE project_name = ? LIMIT 1`,
    [DEFAULT_PROJECT_NAME]
  );

  if (existing) {
    return existing.id;
  }

  // 없으면 생성
  const result = await execute(
    `INSERT INTO projects (project_name, keyword, content_format, status)
     VALUES (?, '분석', 'long', 'completed')`,
    [DEFAULT_PROJECT_NAME]
  );

  return result.insertId;
}

/**
 * POST /api/videos/find-or-create
 * YouTube video ID로 영상을 찾거나 새로 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      youtubeVideoId,
      title,
      channelId,
      channelName,
      subscriberCount,
      viewCount,
      likeCount,
      commentCount,
      thumbnailUrl,
      viralScore,
      viralGrade,
    } = body;

    if (!youtubeVideoId) {
      return NextResponse.json(
        { success: false, error: 'youtubeVideoId is required' },
        { status: 400 }
      );
    }

    // 기존 영상 찾기
    const existingVideo = await db.selectedVideos.findByVideoId(youtubeVideoId);

    if (existingVideo) {
      return NextResponse.json({
        success: true,
        data: existingVideo,
        isNew: false,
      });
    }

    // 기본 프로젝트 확보
    const projectId = await getOrCreateDefaultProject();

    // 새 영상 생성
    const videoId = await db.selectedVideos.create({
      projectId,
      videoId: youtubeVideoId,
      title: title || `영상 ${youtubeVideoId}`,
      channelId: channelId || 'unknown',
      channelName,
      subscriberCount,
      viewCount,
      likeCount,
      commentCount,
      thumbnailUrl,
      viralScore,
      viralGrade,
    });

    const newVideo = await db.selectedVideos.findById(videoId);

    return NextResponse.json({
      success: true,
      data: newVideo,
      isNew: true,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error finding/creating video:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
