import { NextRequest, NextResponse } from 'next/server';
import { TTSService } from '@/services/tts';

const ttsService = new TTSService();

/**
 * GET /api/tts/voices - 사용 가능한 음성 목록 조회
 */
export async function GET() {
  try {
    const voices = await ttsService.getVoices();

    return NextResponse.json({
      success: true,
      data: voices,
    });
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
