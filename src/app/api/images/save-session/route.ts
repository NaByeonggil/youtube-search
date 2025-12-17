import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface Scene {
  scene_id: number;
  description: string;
  characters: string[];
  setting: string;
  mood: string;
  camera_angle: string;
}

interface GenerationResult {
  scene_id: number;
  status: 'pending' | 'generating' | 'success' | 'failed';
  imagePath?: string;
  imageBase64?: string;
  error?: string;
}

/**
 * POST /api/images/save-session - 이미지 생성 세션을 DB에 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      script,
      scenes,
      characters,
      results,
      aspectRatio,
      style,
    } = body;

    if (!script || !results || results.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 성공한 이미지만 필터링
    const successfulResults = results.filter(
      (r: GenerationResult) => r.status === 'success' && r.imageBase64
    );

    if (successfulResults.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 성공한 이미지가 없습니다.' },
        { status: 400 }
      );
    }

    // 1. 프로젝트 생성 (키워드로 식별)
    const projectName = `이미지 생성 - ${new Date().toLocaleDateString('ko-KR')}`;
    const keyword = `image_gen_${Date.now()}`;

    const projectId = await db.projects.create({
      projectName,
      keyword,
      contentFormat: 'long',
    });

    // 2. 이미지 생성 세션을 image_generation_sessions 테이블에 저장
    const { getPool } = await import('@/lib/db');
    const pool = getPool();
    const connection = await pool.getConnection();

    let sessionId: number;
    const savedAssets: number[] = [];

    try {
      // 이미지 생성 세션 저장
      const [sessionResult] = await connection.execute<any>(
        `INSERT INTO image_generation_sessions
         (project_id, original_script, scenes_json, characters_json, aspect_ratio, style_name, style_en, total_scenes, successful_scenes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          script,
          JSON.stringify(scenes || []),
          JSON.stringify(characters || {}),
          aspectRatio || '16:9',
          style?.name || '실사',
          style?.en || 'photorealistic',
          scenes?.length || 0,
          successfulResults.length,
        ]
      );

      sessionId = sessionResult.insertId;

      // 각 이미지 결과 저장
      for (const result of successfulResults) {
        const scene = scenes?.find((s: Scene) => s.scene_id === result.scene_id);

        const [imageResult] = await connection.execute<any>(
          `INSERT INTO generated_images
           (session_id, scene_id, scene_description, image_path, image_base64, generation_status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            sessionId,
            result.scene_id,
            scene?.description || '',
            result.imagePath || '',
            result.imageBase64 || null,
            'completed',
          ]
        );

        savedAssets.push(imageResult.insertId);
      }
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        sessionId,
        savedCount: savedAssets.length,
        assetIds: savedAssets,
        message: `${savedAssets.length}개의 이미지가 DB에 저장되었습니다.`,
      },
    });
  } catch (error: any) {
    console.error('Failed to save session to DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'DB 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
