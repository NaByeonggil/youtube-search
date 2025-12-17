import { NextRequest, NextResponse } from 'next/server';
import { db, query } from '@/lib/db';

interface ScriptRow {
  id: number;
  video_id: number;
  script_purpose: string;
  target_audience: string;
  expected_duration_seconds: number;
  script_structure: string;
  full_script: string;
  hook_text: string;
  intro_text: string;
  body_text: string;
  conclusion_text: string;
  content_format: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  video_title: string;
  channel_name: string;
  thumbnail_url: string;
  youtube_video_id: string;
  project_name: string;
}

/**
 * GET /api/scripts - 대본 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const format = searchParams.get('format') || '';

    let sql = `
      SELECT
        gs.id,
        gs.video_id,
        gs.script_purpose,
        gs.target_audience,
        gs.expected_duration_seconds,
        gs.script_structure,
        gs.full_script,
        gs.hook_text,
        gs.intro_text,
        gs.body_text,
        gs.conclusion_text,
        gs.content_format,
        gs.word_count,
        gs.created_at,
        gs.updated_at,
        sv.title as video_title,
        sv.channel_name,
        sv.thumbnail_url,
        sv.video_id as youtube_video_id,
        p.project_name
      FROM generated_scripts gs
      JOIN selected_videos sv ON gs.video_id = sv.id
      JOIN projects p ON sv.project_id = p.id
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    if (search) {
      sql += ` AND (gs.script_purpose LIKE ? OR gs.full_script LIKE ? OR sv.title LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (format) {
      sql += ` AND gs.content_format = ?`;
      params.push(format);
    }

    sql += ` ORDER BY gs.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const results = await query<ScriptRow[]>(sql, params);

    const formattedResults = results.map(row => ({
      id: row.id,
      videoId: row.video_id,
      youtubeVideoId: row.youtube_video_id,
      videoTitle: row.video_title,
      channelName: row.channel_name,
      thumbnailUrl: row.thumbnail_url,
      projectName: row.project_name,
      scriptPurpose: row.script_purpose,
      targetAudience: row.target_audience,
      expectedDurationSeconds: row.expected_duration_seconds,
      scriptStructure: parseJsonSafe(row.script_structure),
      fullScript: row.full_script,
      hookText: row.hook_text,
      introText: row.intro_text,
      bodyText: row.body_text,
      conclusionText: row.conclusion_text,
      contentFormat: row.content_format,
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM generated_scripts gs
      JOIN selected_videos sv ON gs.video_id = sv.id
      JOIN projects p ON sv.project_id = p.id
      WHERE 1=1
    `;
    const countParams: (string | number)[] = [];

    if (search) {
      countSql += ` AND (gs.script_purpose LIKE ? OR gs.full_script LIKE ? OR sv.title LIKE ?)`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (format) {
      countSql += ` AND gs.content_format = ?`;
      countParams.push(format);
    }

    const countResult = await query<{ total: number }[]>(countSql, countParams);
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
    console.error('Error fetching scripts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scripts - 새 대본 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoId,
      scriptPurpose,
      targetAudience,
      expectedDurationSeconds,
      scriptStructure,
      fullScript,
      hookText,
      introText,
      bodyText,
      conclusionText,
      contentFormat,
      wordCount,
    } = body;

    if (!videoId || !fullScript) {
      return NextResponse.json(
        { success: false, error: 'videoId and fullScript are required' },
        { status: 400 }
      );
    }

    const id = await db.generatedScripts.create({
      videoId,
      scriptPurpose,
      targetAudience,
      expectedDurationSeconds,
      scriptStructure,
      fullScript,
      hookText,
      introText,
      bodyText,
      conclusionText,
      contentFormat,
      wordCount: wordCount || fullScript.length,
    });

    const script = await db.generatedScripts.findById(id);

    return NextResponse.json({
      success: true,
      data: script,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating script:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

function parseJsonSafe(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
