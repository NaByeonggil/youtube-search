import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/projects - 프로젝트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const projects = await db.projects.findAll(limit, offset);

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: { limit, offset },
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects - 새 프로젝트 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectName, keyword, contentFormat } = body;

    if (!projectName || !keyword) {
      return NextResponse.json(
        { success: false, error: 'projectName and keyword are required' },
        { status: 400 }
      );
    }

    const projectId = await db.projects.create({
      projectName,
      keyword,
      contentFormat: contentFormat || 'long',
    });

    const project = await db.projects.findById(projectId);

    return NextResponse.json({
      success: true,
      data: project,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
