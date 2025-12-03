import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationService } from '@/services/imageGen';
import { db } from '@/lib/db';
import { ContentFormat } from '@/types';

const imageService = new ImageGenerationService();

/**
 * POST /api/images/generate - 이미지 생성
 * PRD 6단계: Gemini Image 이미지 생성 (gemini-3-pro-image-preview)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompts,
      projectId,
      videoId,
      format = 'long',
      quality = 'standard',
      style = 'natural',
      saveToDb = false,
      dbScriptId,
    } = body;

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'prompts array is required' },
        { status: 400 }
      );
    }

    if (!projectId || !videoId) {
      return NextResponse.json(
        { success: false, error: 'projectId and videoId are required' },
        { status: 400 }
      );
    }

    console.log(`Generating ${prompts.length} images with Gemini (format: ${format})...`);

    // 이미지 생성 및 저장
    const results = await imageService.generateImagesFromScript(
      '',
      prompts,
      projectId,
      videoId,
      format as ContentFormat
    );

    // 성공한 이미지 목록
    const successfulImages = results.filter(r => !r.error);
    const failedImages = results.filter(r => r.error);

    // DB에 저장
    if (saveToDb && dbScriptId) {
      for (const img of successfulImages) {
        await db.generatedAssets.create({
          scriptId: dbScriptId,
          assetType: 'image',
          fileName: img.fileName,
          filePath: img.filePath,
          fileSizeBytes: img.fileSize,
          imagePrompt: img.prompt,
          imageResolution: format === 'short' ? '1080x1920' : '1920x1080',
          imageSequence: img.index,
          generationStatus: 'completed',
        });
      }

      for (const img of failedImages) {
        await db.generatedAssets.create({
          scriptId: dbScriptId,
          assetType: 'image',
          fileName: '',
          filePath: '',
          imagePrompt: img.prompt,
          imageSequence: img.index,
          generationStatus: 'failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        format,
        model: 'gemini-3-pro-preview',
        totalRequested: prompts.length,
        successCount: successfulImages.length,
        failedCount: failedImages.length,
        images: results,
      },
    });
  } catch (error: any) {
    console.error('Error generating images:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
