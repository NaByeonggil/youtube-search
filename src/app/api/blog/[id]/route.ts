import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface BlogRow extends RowDataPacket {
  id: number;
  source_video_id: string;
  source_video_title: string;
  source_channel_name: string;
  idea_title: string;
  idea_description: string;
  idea_target_audience: string;
  blog_title: string;
  meta_description: string;
  introduction: string;
  sections: string;
  conclusion: string;
  tags: string;
  estimated_read_time: string;
  custom_target: string;
  tone_and_manner: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blogId = parseInt(id);

    if (isNaN(blogId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 블로그 ID입니다.' },
        { status: 400 }
      );
    }

    const blog = await db.generatedBlogs.findById(blogId) as BlogRow | null;

    if (!blog) {
      return NextResponse.json(
        { success: false, error: '블로그를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: blog.id,
        sourceVideoId: blog.source_video_id,
        sourceVideoTitle: blog.source_video_title,
        sourceChannelName: blog.source_channel_name,
        ideaTitle: blog.idea_title,
        ideaDescription: blog.idea_description,
        ideaTargetAudience: blog.idea_target_audience,
        blogTitle: blog.blog_title,
        metaDescription: blog.meta_description,
        introduction: blog.introduction,
        sections: typeof blog.sections === 'string' ? JSON.parse(blog.sections) : blog.sections,
        conclusion: blog.conclusion,
        tags: typeof blog.tags === 'string' ? JSON.parse(blog.tags) : blog.tags,
        estimatedReadTime: blog.estimated_read_time,
        customTarget: blog.custom_target,
        toneAndManner: blog.tone_and_manner,
        wordCount: blog.word_count,
        createdAt: blog.created_at,
        updatedAt: blog.updated_at,
      },
    });
  } catch (error) {
    console.error('Blog detail error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '블로그 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blogId = parseInt(id);

    if (isNaN(blogId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 블로그 ID입니다.' },
        { status: 400 }
      );
    }

    await db.generatedBlogs.delete(blogId);

    return NextResponse.json({
      success: true,
      message: '블로그가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Blog delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '블로그 삭제 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
