import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface AnalysisHistoryRow extends RowDataPacket {
  id: number;
  video_id: number;
  total_comments_analyzed: number;
  positive_count: number;
  negative_count: number;
  positive_ratio: number;
  positive_summary: string;
  positive_keywords: string;
  negative_summary: string;
  negative_keywords: string;
  improvement_suggestions: string;
  analysis_model: string;
  analyzed_at: string;
  youtube_video_id: string;
  video_title: string;
  channel_name: string;
  thumbnail_url: string;
  view_count: number;
  viral_score: number;
  viral_grade: string;
  project_name: string;
}

/**
 * GET /api/analysis/history - 댓글 분석 기록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    let sql = `
      SELECT
        ca.id,
        ca.video_id,
        ca.total_comments_analyzed,
        ca.positive_count,
        ca.negative_count,
        ca.positive_ratio,
        ca.positive_summary,
        ca.positive_keywords,
        ca.negative_summary,
        ca.negative_keywords,
        ca.improvement_suggestions,
        ca.analysis_model,
        ca.analyzed_at,
        sv.video_id as youtube_video_id,
        sv.title as video_title,
        sv.channel_name,
        sv.thumbnail_url,
        sv.view_count,
        sv.viral_score,
        sv.viral_grade,
        p.project_name
      FROM comment_analysis ca
      JOIN selected_videos sv ON ca.video_id = sv.id
      JOIN projects p ON sv.project_id = p.id
    `;

    const params: (string | number)[] = [];

    if (search) {
      sql += ` WHERE sv.title LIKE ? OR sv.channel_name LIKE ? OR p.project_name LIKE ?`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY ca.analyzed_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const results = await query<AnalysisHistoryRow[]>(sql, params);

    // Parse JSON fields
    const formattedResults = results.map(row => ({
      id: row.id,
      videoId: row.video_id,
      youtubeVideoId: row.youtube_video_id,
      videoTitle: row.video_title,
      channelName: row.channel_name,
      thumbnailUrl: row.thumbnail_url,
      viewCount: row.view_count,
      viralScore: row.viral_score,
      viralGrade: row.viral_grade,
      projectName: row.project_name,
      totalCommentsAnalyzed: row.total_comments_analyzed,
      positiveCount: row.positive_count,
      negativeCount: row.negative_count,
      positiveRatio: row.positive_ratio,
      positiveSummary: row.positive_summary,
      positiveKeywords: parseJsonSafe(row.positive_keywords),
      negativeSummary: row.negative_summary,
      negativeKeywords: parseJsonSafe(row.negative_keywords),
      improvementSuggestions: row.improvement_suggestions,
      analysisModel: row.analysis_model,
      analyzedAt: row.analyzed_at,
    }));

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM comment_analysis ca
      JOIN selected_videos sv ON ca.video_id = sv.id
      JOIN projects p ON sv.project_id = p.id
    `;

    if (search) {
      countSql += ` WHERE sv.title LIKE ? OR sv.channel_name LIKE ? OR p.project_name LIKE ?`;
    }

    const countResult = await query<(RowDataPacket & { total: number })[]>(
      countSql,
      search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
    );
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: formattedResults,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching analysis history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

function parseJsonSafe(str: string): string[] {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
