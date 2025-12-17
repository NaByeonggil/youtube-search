import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface ScriptAnalysisRow extends RowDataPacket {
  id: number;
  title: string | null;
  original_script: string;
  script_source: 'manual' | 'youtube-caption' | 'whisper';
  youtube_video_id: string | null;
  structure_sections: string | null;
  character_count: string | null;
  storytelling_techniques: string | null;
  hooks_analysis: string | null;
  improvements: string | null;
  planning_notes: string | null;
  total_characters: number;
  estimated_duration: string | null;
  analysis_model: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/script/structure-analysis - 대본 구조 분석 기록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const id = searchParams.get('id');

    // 특정 ID 조회
    if (id) {
      const result = await db.scriptStructureAnalysis.findById(parseInt(id)) as ScriptAnalysisRow | null;
      if (!result) {
        return NextResponse.json(
          { success: false, error: '분석 기록을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: formatAnalysisRow(result),
      });
    }

    // 목록 조회
    const results = await db.scriptStructureAnalysis.findAll(limit, offset, search || undefined) as ScriptAnalysisRow[];
    const total = await db.scriptStructureAnalysis.count(search || undefined);

    const formattedResults = results.map(formatAnalysisRow);

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
    console.error('Error fetching script structure analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/script/structure-analysis - 대본 구조 분석 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      originalScript,
      scriptSource,
      youtubeVideoId,
      analysis,
    } = body;

    if (!originalScript || originalScript.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '대본 텍스트가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: '분석 결과가 필요합니다.' },
        { status: 400 }
      );
    }

    const insertId = await db.scriptStructureAnalysis.create({
      title: title || generateTitle(originalScript),
      originalScript,
      scriptSource: scriptSource || 'manual',
      youtubeVideoId: youtubeVideoId || undefined,
      structureSections: analysis.structure,
      characterCount: analysis.characterCount,
      storytellingTechniques: analysis.storytelling,
      hooksAnalysis: analysis.hooks,
      improvements: analysis.improvements,
      planningNotes: analysis.planningNotes,
      totalCharacters: analysis.characterCount?.total || originalScript.length,
      estimatedDuration: analysis.characterCount?.estimatedDuration || undefined,
      analysisModel: 'gemini-3-pro',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: insertId,
        message: '분석 결과가 저장되었습니다.',
      },
    });
  } catch (error: unknown) {
    console.error('Error saving script structure analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/script/structure-analysis - 대본 구조 분석 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await db.scriptStructureAnalysis.delete(parseInt(id));

    return NextResponse.json({
      success: true,
      message: '분석 기록이 삭제되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Error deleting script structure analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Helper functions
function parseJsonSafe<T>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function formatAnalysisRow(row: ScriptAnalysisRow) {
  return {
    id: row.id,
    title: row.title,
    originalScript: row.original_script,
    scriptSource: row.script_source,
    youtubeVideoId: row.youtube_video_id,
    analysis: {
      structure: parseJsonSafe(row.structure_sections),
      characterCount: parseJsonSafe(row.character_count),
      storytelling: parseJsonSafe(row.storytelling_techniques),
      hooks: parseJsonSafe(row.hooks_analysis),
      improvements: parseJsonSafe(row.improvements),
      planningNotes: parseJsonSafe(row.planning_notes),
    },
    totalCharacters: row.total_characters,
    estimatedDuration: row.estimated_duration,
    analysisModel: row.analysis_model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateTitle(script: string): string {
  // 첫 줄이나 첫 50자를 제목으로 사용
  const firstLine = script.split('\n')[0].trim();
  if (firstLine.length > 0 && firstLine.length <= 100) {
    return firstLine;
  }
  return script.substring(0, 50).trim() + (script.length > 50 ? '...' : '');
}
