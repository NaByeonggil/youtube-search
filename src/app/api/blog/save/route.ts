import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface BlogSection {
  heading: string;
  content: string;
}

interface BlogSaveRequest {
  sourceVideo?: {
    videoId: string;
    title: string;
    channelName?: string;
  };
  idea?: {
    title: string;
    description: string;
    targetAudience: string;
  };
  blogPost: {
    title: string;
    metaDescription?: string;
    introduction?: string;
    sections?: BlogSection[];
    conclusion?: string;
    tags?: string[];
    estimatedReadTime?: string;
  };
  options?: {
    customTarget?: string;
    toneAndManner?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BlogSaveRequest = await request.json();
    const { sourceVideo, idea, blogPost, options } = body;

    if (!blogPost || !blogPost.title) {
      return NextResponse.json(
        { success: false, error: '블로그 제목이 필요합니다.' },
        { status: 400 }
      );
    }

    // Calculate word count
    let wordCount = 0;
    if (blogPost.introduction) {
      wordCount += blogPost.introduction.length;
    }
    if (blogPost.sections) {
      blogPost.sections.forEach(section => {
        wordCount += (section.heading?.length || 0) + (section.content?.length || 0);
      });
    }
    if (blogPost.conclusion) {
      wordCount += blogPost.conclusion.length;
    }

    const blogId = await db.generatedBlogs.create({
      sourceVideoId: sourceVideo?.videoId,
      sourceVideoTitle: sourceVideo?.title,
      sourceChannelName: sourceVideo?.channelName,
      ideaTitle: idea?.title,
      ideaDescription: idea?.description,
      ideaTargetAudience: idea?.targetAudience,
      blogTitle: blogPost.title,
      metaDescription: blogPost.metaDescription,
      introduction: blogPost.introduction,
      sections: blogPost.sections,
      conclusion: blogPost.conclusion,
      tags: blogPost.tags,
      estimatedReadTime: blogPost.estimatedReadTime,
      customTarget: options?.customTarget,
      toneAndManner: options?.toneAndManner,
      wordCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: blogId,
        message: '블로그가 성공적으로 저장되었습니다.',
      },
    });
  } catch (error) {
    console.error('Blog save error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '블로그 저장 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
