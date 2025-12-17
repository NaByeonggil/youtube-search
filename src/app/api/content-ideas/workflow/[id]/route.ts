import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface WorkflowRow extends RowDataPacket {
  id: number;
  source_video_id: string;
  source_video_title: string;
  source_channel_name: string;
  source_thumbnail_url: string;
  content_format: 'short' | 'long';
  total_comments_analyzed: number;
  viewer_questions: string;
  pain_points: string;
  content_requests: string;
  related_topics: string;
  hot_topics: string;
  selected_idea_title: string;
  selected_idea_description: string;
  selected_idea_target_audience: string;
  selected_idea_viral_score: string;
  selected_idea_format: string;
  selected_idea_reasoning: string;
  outline_title: string;
  outline_hook: string;
  outline_duration: string;
  outline_sections: string;
  outline_cta: string;
  outline_thumbnail_idea: string;
  outline_tags: string;
  generated_script_id: number | null;
  generated_script_full: string | null;
  workflow_status: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * GET /api/content-ideas/workflow/[id] - 단일 워크플로우 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connection = await getPool().getConnection();

    try {
      const [rows] = await connection.execute<WorkflowRow[]>(
        'SELECT * FROM content_idea_workflows WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '워크플로우를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const row = rows[0];
      const workflow = {
        id: row.id,
        sourceVideo: {
          videoId: row.source_video_id,
          title: row.source_video_title,
          channelTitle: row.source_channel_name,
          thumbnailUrl: row.source_thumbnail_url,
        },
        format: row.content_format,
        totalCommentsAnalyzed: row.total_comments_analyzed,
        contentIdeas: {
          viewerQuestions: JSON.parse(row.viewer_questions || '[]'),
          painPoints: JSON.parse(row.pain_points || '[]'),
          contentRequests: JSON.parse(row.content_requests || '[]'),
          relatedTopics: JSON.parse(row.related_topics || '[]'),
          hotTopics: JSON.parse(row.hot_topics || '[]'),
        },
        selectedIdea: row.selected_idea_title ? {
          title: row.selected_idea_title,
          description: row.selected_idea_description,
          targetAudience: row.selected_idea_target_audience,
          estimatedViralScore: row.selected_idea_viral_score,
          suggestedFormat: row.selected_idea_format,
          reasoning: row.selected_idea_reasoning,
        } : null,
        outline: row.outline_title ? {
          title: row.outline_title,
          hook: row.outline_hook,
          estimatedDuration: row.outline_duration,
          sections: JSON.parse(row.outline_sections || '[]'),
          callToAction: row.outline_cta,
          thumbnailIdea: row.outline_thumbnail_idea,
          tags: JSON.parse(row.outline_tags || '[]'),
        } : null,
        generatedScript: row.generated_script_full ? {
          fullScript: row.generated_script_full,
        } : null,
        status: row.workflow_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      return NextResponse.json({
        success: true,
        data: workflow,
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/content-ideas/workflow/[id] - 워크플로우 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connection = await getPool().getConnection();

    try {
      await connection.execute(
        'DELETE FROM content_idea_workflows WHERE id = ?',
        [id]
      );

      return NextResponse.json({
        success: true,
        message: '워크플로우가 삭제되었습니다.',
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
