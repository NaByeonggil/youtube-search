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
 * GET /api/images/history/[id] - 단일 세션 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      // 세션 조회
      const [sessions] = await connection.execute<SessionRow[]>(
        'SELECT * FROM image_generation_sessions WHERE id = ?',
        [id]
      );

      if (sessions.length === 0) {
        return NextResponse.json(
          { success: false, error: '세션을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const session = sessions[0];

      // 이미지 조회
      const [images] = await connection.execute<ImageRow[]>(
        `SELECT * FROM generated_images
         WHERE session_id = ?
         ORDER BY scene_id`,
        [id]
      );

      const data = {
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

      return NextResponse.json({ success: true, data });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Failed to get session:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/history/[id] - 단일 세션 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      // CASCADE로 인해 generated_images도 자동 삭제됨
      await connection.execute(
        'DELETE FROM image_generation_sessions WHERE id = ?',
        [id]
      );

      return NextResponse.json({
        success: true,
        message: '세션이 삭제되었습니다.',
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Failed to delete session:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
