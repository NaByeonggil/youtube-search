import { NextRequest, NextResponse } from 'next/server';
import { SubtitleService } from '@/services/tts';
import { db } from '@/lib/db';
import { ContentFormat } from '@/types';

const subtitleService = new SubtitleService();

/**
 * POST /api/subtitles/generate - 자막 생성
 * PRD 7단계: SRT/VTT 자막 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      script,
      durationSeconds,
      projectId,
      videoId,
      format = 'long',
      subtitleFormat = 'srt',
      saveToDb = false,
      dbScriptId,
    } = body;

    if (!script || !durationSeconds) {
      return NextResponse.json(
        { success: false, error: 'script and durationSeconds are required' },
        { status: 400 }
      );
    }

    if (!projectId || !videoId) {
      return NextResponse.json(
        { success: false, error: 'projectId and videoId are required' },
        { status: 400 }
      );
    }

    console.log(`Generating ${subtitleFormat} subtitles (format: ${format})...`);

    // 자막 내용 생성
    let subtitleContent: string;
    if (subtitleFormat === 'vtt') {
      subtitleContent = subtitleService.generateVTT(
        script,
        durationSeconds,
        format as ContentFormat
      );
    } else {
      subtitleContent = subtitleService.generateSRT(
        script,
        durationSeconds,
        format as ContentFormat
      );
    }

    // 자막 파일 저장
    const savedSubtitle = await subtitleService.saveSubtitle(
      subtitleContent,
      projectId,
      videoId,
      format as ContentFormat,
      subtitleFormat as 'srt' | 'vtt'
    );

    // DB에 저장
    if (saveToDb && dbScriptId) {
      await db.generatedAssets.create({
        scriptId: dbScriptId,
        assetType: 'subtitle',
        fileName: savedSubtitle.fileName,
        filePath: savedSubtitle.filePath,
        fileSizeBytes: savedSubtitle.fileSize,
        subtitleFormat: subtitleFormat as 'srt' | 'vtt',
        subtitleLineCount: savedSubtitle.lineCount,
        generationStatus: 'completed',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        format,
        subtitleFormat,
        content: subtitleContent,
        ...savedSubtitle,
      },
    });
  } catch (error: any) {
    console.error('Error generating subtitles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
