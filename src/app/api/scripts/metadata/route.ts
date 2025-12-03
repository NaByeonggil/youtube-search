import { NextRequest, NextResponse } from 'next/server';
import { ClaudeService } from '@/services/claude';
import { ContentFormat } from '@/types';

const claudeService = new ClaudeService();

/**
 * POST /api/scripts/metadata - SEO 메타데이터 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, format = 'long' } = body;

    if (!script) {
      return NextResponse.json(
        { success: false, error: 'script is required' },
        { status: 400 }
      );
    }

    console.log(`Generating SEO metadata (format: ${format})...`);

    const metadata = await claudeService.generateMetadata(
      script,
      format as ContentFormat
    );

    return NextResponse.json({
      success: true,
      data: {
        format,
        ...metadata,
      },
    });
  } catch (error: any) {
    console.error('Error generating metadata:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
