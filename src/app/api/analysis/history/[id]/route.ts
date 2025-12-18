import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

/**
 * DELETE /api/analysis/history/[id] - 댓글 분석 기록 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysisId = parseInt(id);

    if (isNaN(analysisId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid analysis ID' },
        { status: 400 }
      );
    }

    const result = await execute(
      `DELETE FROM comment_analysis WHERE id = ?`,
      [analysisId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: '분석 기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '분석 기록이 삭제되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Error deleting analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
