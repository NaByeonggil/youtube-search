import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

/**
 * GET /api/reports/[id] - 리포트 조회/다운로드
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reportId = parseInt(id);

    const reports = await query<RowDataPacket[]>(
      'SELECT * FROM full_reports WHERE id = ?',
      [reportId]
    );

    if (reports.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    const report = reports[0];

    // 다운로드 형식 확인
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    if (download) {
      // 파일 다운로드
      const fileContent = await fs.readFile(report.file_path, 'utf-8');

      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${report.file_name}"`,
        },
      });
    }

    // JSON 응답
    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        projectId: report.project_id,
        videoId: report.video_id,
        reportType: report.report_type,
        fileName: report.file_name,
        filePath: report.file_path,
        fileSize: report.file_size_bytes,
        generatedAt: report.generated_at,
        markdown: report.markdown_content,
      },
    });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
