import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface SessionRow extends RowDataPacket {
  id: number;
  project_id: number;
  original_script: string;
  scenes_json: string;
  characters_json: string;
  aspect_ratio: string;
  style_name: string;
  style_en: string;
  total_scenes: number;
  successful_scenes: number;
  created_at: Date;
  updated_at: Date;
}

interface ImageRow extends RowDataPacket {
  id: number;
  session_id: number;
  scene_id: number;
  scene_description: string;
  image_path: string;
  image_base64: string;
  generation_status: string;
  created_at: Date;
}

/**
 * GET /api/images/history - 이미지 생성 세션 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      // 세션 목록 조회
      const [sessions] = await connection.execute<SessionRow[]>(
        `SELECT * FROM image_generation_sessions
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      // 총 개수 조회
      const [countResult] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM image_generation_sessions'
      );
      const total = countResult[0].total;

      // 각 세션의 이미지 조회
      const sessionsWithImages = await Promise.all(
        sessions.map(async (session) => {
          const [images] = await connection.execute<ImageRow[]>(
            `SELECT * FROM generated_images
             WHERE session_id = ?
             ORDER BY scene_id`,
            [session.id]
          );

          return {
            id: session.id,
            projectId: session.project_id,
            originalScript: session.original_script || '',
            scenes: JSON.parse(session.scenes_json || '[]'),
            characters: JSON.parse(session.characters_json || '{}'),
            aspectRatio: session.aspect_ratio,
            style: {
              name: session.style_name,
              en: session.style_en,
            },
            totalScenes: session.total_scenes,
            successCount: session.successful_scenes,
            failedCount: session.total_scenes - session.successful_scenes,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
            images: images.map((img) => ({
              id: img.id,
              sceneId: img.scene_id,
              description: img.scene_description,
              imagePath: img.image_path,
              imageBase64: img.image_base64,
              status: img.generation_status,
            })),
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: sessionsWithImages,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Failed to get image history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/history - 전체 기록 삭제
 */
export async function DELETE() {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.execute('DELETE FROM generated_images');
      await connection.execute('DELETE FROM image_generation_sessions');

      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Failed to clear history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
