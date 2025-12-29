import { NextRequest, NextResponse } from 'next/server';
import { db, query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface ImageSessionRow extends RowDataPacket {
  id: number;
  project_id: number;
  original_script: string;
  aspect_ratio: string;
  style_name: string;
  total_scenes: number;
  successful_scenes: number;
  created_at: string;
}

interface GeneratedImageRow extends RowDataPacket {
  id: number;
  session_id: number;
  scene_id: number;
  scene_description: string;
  image_path: string;
  image_base64: string;
  generation_status: string;
  created_at: string;
}

/**
 * GET /api/projects/[id] - 프로젝트 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    const project = await db.projects.findById(projectId);

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // 관련 영상 목록도 함께 조회
    const videos = await db.selectedVideos.findByProjectId(projectId);

    // 채팅 이미지 프로젝트인 경우 이미지 세션과 생성된 이미지도 조회
    let imageSessions: ImageSessionRow[] = [];
    let generatedImages: GeneratedImageRow[] = [];

    // 이미지 세션 조회
    imageSessions = await query<ImageSessionRow[]>(
      `SELECT * FROM image_generation_sessions WHERE project_id = ? ORDER BY created_at DESC`,
      [projectId]
    );

    // 각 세션의 이미지 조회
    if (imageSessions.length > 0) {
      const sessionIds = imageSessions.map(s => s.id);
      generatedImages = await query<GeneratedImageRow[]>(
        `SELECT * FROM generated_images WHERE session_id IN (${sessionIds.join(',')}) ORDER BY scene_id`,
        []
      );
    }

    // 세션별로 이미지 그룹화
    const sessionsWithImages = imageSessions.map(session => ({
      id: session.id,
      projectId: session.project_id,
      originalScript: session.original_script,
      aspectRatio: session.aspect_ratio,
      styleName: session.style_name,
      totalScenes: session.total_scenes,
      successfulScenes: session.successful_scenes,
      createdAt: session.created_at,
      images: generatedImages
        .filter(img => img.session_id === session.id)
        .map(img => ({
          id: img.id,
          sceneId: img.scene_id,
          sceneDescription: img.scene_description,
          imagePath: img.image_path,
          imageBase64: img.image_base64,
          generationStatus: img.generation_status,
          createdAt: img.created_at,
        })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        videos,
        imageSessions: sessionsWithImages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id] - 프로젝트 상태 업데이트
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      );
    }

    await db.projects.updateStatus(projectId, status);
    const project = await db.projects.findById(projectId);

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id] - 프로젝트 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    const project = await db.projects.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    await db.projects.delete(projectId);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
