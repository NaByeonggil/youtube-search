import { NextRequest, NextResponse } from 'next/server';
import FFmpegService from '@/services/ffmpeg';
import { db } from '@/lib/db';
import { ContentFormat } from '@/types';

const ffmpegService = new FFmpegService();

/**
 * POST /api/video/create - 영상 생성
 * PRD 7단계: 이미지 + 음성 + 자막 합성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      videoId,
      images,
      audioPath,
      subtitlePath,
      format = 'long',
      outputFileName,
      saveToDb = false,
      dbScriptId,
    } = body;

    if (!projectId || !videoId) {
      return NextResponse.json(
        { success: false, error: 'projectId and videoId are required' },
        { status: 400 }
      );
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'images array is required' },
        { status: 400 }
      );
    }

    if (!audioPath) {
      return NextResponse.json(
        { success: false, error: 'audioPath is required' },
        { status: 400 }
      );
    }

    // FFmpeg 설치 확인
    const ffmpegInstalled = await ffmpegService.checkInstallation();
    if (!ffmpegInstalled) {
      return NextResponse.json(
        { success: false, error: 'FFmpeg is not installed on the system' },
        { status: 500 }
      );
    }

    console.log(`Creating video (format: ${format})...`);
    console.log(`Images: ${images.length}, Audio: ${audioPath}`);

    // 영상 생성
    const videoResult = await ffmpegService.createVideo(
      projectId,
      videoId,
      format as ContentFormat,
      {
        images,
        audioPath,
        subtitlePath,
        outputFileName,
      }
    );

    // DB에 저장
    if (saveToDb && dbScriptId) {
      await db.generatedAssets.create({
        scriptId: dbScriptId,
        assetType: 'video',
        fileName: videoResult.fileName,
        filePath: videoResult.filePath,
        fileSizeBytes: videoResult.fileSize,
        videoResolution: format === 'short' ? '1080x1920' : '1920x1080',
        videoDurationSeconds: videoResult.duration,
        videoCodec: 'H.264',
        videoFps: 30,
        generationStatus: 'completed',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        format,
        ...videoResult,
      },
    });
  } catch (error: any) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/create - FFmpeg 상태 확인
 */
export async function GET() {
  try {
    const installed = await ffmpegService.checkInstallation();

    return NextResponse.json({
      success: true,
      data: {
        ffmpegInstalled: installed,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      data: {
        ffmpegInstalled: false,
        error: error.message,
      },
    });
  }
}
