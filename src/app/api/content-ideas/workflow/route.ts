import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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
 * POST /api/content-ideas/workflow - 워크플로우 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceVideo,
      contentIdeas,
      selectedIdea,
      outline,
      generatedScript,
      format,
    } = body;

    if (!sourceVideo || !sourceVideo.videoId) {
      return NextResponse.json(
        { success: false, error: 'sourceVideo is required' },
        { status: 400 }
      );
    }

    const connection = await getPool().getConnection();

    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO content_idea_workflows (
          source_video_id,
          source_video_title,
          source_channel_name,
          source_thumbnail_url,
          content_format,
          total_comments_analyzed,
          viewer_questions,
          pain_points,
          content_requests,
          related_topics,
          hot_topics,
          selected_idea_title,
          selected_idea_description,
          selected_idea_target_audience,
          selected_idea_viral_score,
          selected_idea_format,
          selected_idea_reasoning,
          outline_title,
          outline_hook,
          outline_duration,
          outline_sections,
          outline_cta,
          outline_thumbnail_idea,
          outline_tags,
          generated_script_full,
          workflow_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sourceVideo.videoId,
          sourceVideo.title || '',
          sourceVideo.channelTitle || '',
          sourceVideo.thumbnailUrl || '',
          format || 'long',
          contentIdeas?.totalCommentsAnalyzed || 0,
          JSON.stringify(contentIdeas?.viewerQuestions || []),
          JSON.stringify(contentIdeas?.painPoints || []),
          JSON.stringify(contentIdeas?.contentRequests || []),
          JSON.stringify(contentIdeas?.relatedTopics || []),
          JSON.stringify(contentIdeas?.hotTopics || []),
          selectedIdea?.title || '',
          selectedIdea?.description || '',
          selectedIdea?.targetAudience || '',
          selectedIdea?.estimatedViralScore || '',
          selectedIdea?.suggestedFormat || '',
          selectedIdea?.reasoning || '',
          outline?.title || '',
          outline?.hook || '',
          outline?.estimatedDuration || '',
          JSON.stringify(outline?.sections || []),
          outline?.callToAction || '',
          outline?.thumbnailIdea || '',
          JSON.stringify(outline?.tags || []),
          generatedScript?.fullScript || null,
          generatedScript ? 'script_generated' : outline ? 'outline_created' : 'idea_selected',
        ]
      );

      return NextResponse.json({
        success: true,
        data: {
          id: result.insertId,
          message: '워크플로우가 저장되었습니다.',
        },
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error saving workflow:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/content-ideas/workflow - 워크플로우 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    const connection = await getPool().getConnection();

    try {
      let query = `
        SELECT * FROM content_idea_workflows
        ${status ? 'WHERE workflow_status = ?' : ''}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const params = status ? [status, limit, offset] : [limit, offset];
      const [rows] = await connection.execute<WorkflowRow[]>(query, params);

      // 총 개수 조회
      const [countResult] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM content_idea_workflows ${status ? 'WHERE workflow_status = ?' : ''}`,
        status ? [status] : []
      );

      const total = countResult[0].total;

      // JSON 파싱
      const workflows = rows.map(row => ({
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
      }));

      return NextResponse.json({
        success: true,
        data: workflows,
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
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
