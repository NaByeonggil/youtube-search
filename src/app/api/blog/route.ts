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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    const blogs = await db.generatedBlogs.findAll(limit, offset, search) as BlogRow[];
    const total = await db.generatedBlogs.count(search);

    const formattedBlogs = blogs.map((blog) => ({
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
    }));

    return NextResponse.json({
      success: true,
      data: formattedBlogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Blog list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '블로그 목록 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
