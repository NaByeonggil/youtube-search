import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

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
 * GET /api/scripts/[id] - 대본 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scriptId = parseInt(id);

    if (isNaN(scriptId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid script ID' },
        { status: 400 }
      );
    }

    const sql = `
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
      WHERE gs.id = ?
    `;

    const results = await query<ScriptRow[]>(sql, [scriptId]);

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Script not found' },
        { status: 404 }
      );
    }

    const row = results[0];
    const script = {
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
    };

    return NextResponse.json({
      success: true,
      data: script,
    });
  } catch (error: unknown) {
    console.error('Error fetching script:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scripts/[id] - 대본 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scriptId = parseInt(id);

    if (isNaN(scriptId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid script ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
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
    } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];

    if (scriptPurpose !== undefined) {
      updates.push('script_purpose = ?');
      values.push(scriptPurpose);
    }
    if (targetAudience !== undefined) {
      updates.push('target_audience = ?');
      values.push(targetAudience);
    }
    if (expectedDurationSeconds !== undefined) {
      updates.push('expected_duration_seconds = ?');
      values.push(expectedDurationSeconds);
    }
    if (scriptStructure !== undefined) {
      updates.push('script_structure = ?');
      values.push(JSON.stringify(scriptStructure));
    }
    if (fullScript !== undefined) {
      updates.push('full_script = ?');
      values.push(fullScript);
      updates.push('word_count = ?');
      values.push(fullScript.length);
    }
    if (hookText !== undefined) {
      updates.push('hook_text = ?');
      values.push(hookText);
    }
    if (introText !== undefined) {
      updates.push('intro_text = ?');
      values.push(introText);
    }
    if (bodyText !== undefined) {
      updates.push('body_text = ?');
      values.push(bodyText);
    }
    if (conclusionText !== undefined) {
      updates.push('conclusion_text = ?');
      values.push(conclusionText);
    }
    if (contentFormat !== undefined) {
      updates.push('content_format = ?');
      values.push(contentFormat);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(scriptId);

    await execute(
      `UPDATE generated_scripts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: 'Script updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating script:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scripts/[id] - 대본 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scriptId = parseInt(id);

    if (isNaN(scriptId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid script ID' },
        { status: 400 }
      );
    }

    const result = await execute(
      'DELETE FROM generated_scripts WHERE id = ?',
      [scriptId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Script deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting script:', error);
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
