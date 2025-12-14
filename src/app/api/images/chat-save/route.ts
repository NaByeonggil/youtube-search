import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/images/chat-save - 채팅에서 생성된 개별 이미지를 DB에 저장
 * 파일명 형식: {생성날짜}-{채팅명}.png
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      imageBase64,
      filename,
      aspectRatio = '16:9',
      style = '실사',
    } = body;

    if (!prompt || !imageBase64) {
      return NextResponse.json(
        { success: false, error: '저장할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 1. 프로젝트 생성 (채팅 이미지용)
    const projectName = `채팅 이미지 - ${new Date().toLocaleDateString('ko-KR')}`;
    const keyword = `chat_image_${Date.now()}`;

    const projectId = await db.projects.create({
      projectName,
      keyword,
      contentFormat: 'long',
    });

    // 2. 이미지 생성 세션 저장
    const { getPool } = await import('@/lib/db');
    const pool = getPool();
    const connection = await pool.getConnection();

    let sessionId: number;
    let imageId: number;

    try {
      // 세션 생성
      const [sessionResult] = await connection.execute<any>(
        `INSERT INTO image_generation_sessions
         (project_id, original_script, scenes_json, characters_json, aspect_ratio, style_name, style_en, total_scenes, successful_scenes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          prompt, // 프롬프트를 original_script로 저장
          JSON.stringify([{ scene_id: 1, description: prompt }]),
          JSON.stringify({}),
          aspectRatio,
          style,
          style === '실사' ? 'photorealistic' : style === '3D' ? '3D render' : 'animation',
          1,
          1,
        ]
      );

      sessionId = sessionResult.insertId;

      // 이미지 저장
      const [imageResult] = await connection.execute<any>(
        `INSERT INTO generated_images
         (session_id, scene_id, scene_description, image_path, image_base64, generation_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          1,
          prompt,
          filename || '',
          imageBase64,
          'completed',
        ]
      );

      imageId = imageResult.insertId;

    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        sessionId,
        imageId,
        filename,
        message: '이미지가 DB에 저장되었습니다.',
      },
    });

  } catch (error: any) {
    console.error('Failed to save chat image to DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'DB 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
