import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationService } from '@/services/imageGen';
import { ContentFormat } from '@/types';

const imageService = new ImageGenerationService();

/**
 * POST /api/images/thumbnail - 썸네일 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, thumbnailText, format = 'long', projectId, videoId } = body;

    if (!script || !thumbnailText) {
      return NextResponse.json(
        { success: false, error: 'script and thumbnailText are required' },
        { status: 400 }
      );
    }

    console.log(`Generating thumbnail (format: ${format})...`);

    const result = await imageService.generateThumbnail(
      script,
      thumbnailText,
      format as ContentFormat
    );

    // 썸네일 저장 (base64 → 파일)
    let savedThumbnail = null;
    if (projectId && videoId && result.base64) {
      savedThumbnail = await imageService.saveBase64Image(
        result.base64,
        result.mimeType,
        projectId,
        videoId,
        999, // thumbnail index
        format as ContentFormat
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        format,
        thumbnailText,
        model: 'gemini-3-pro-preview',
        base64: result.base64,
        mimeType: result.mimeType,
        revisedPrompt: result.revisedPrompt,
        savedFile: savedThumbnail,
      },
    });
  } catch (error: any) {
    console.error('Error generating thumbnail:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
