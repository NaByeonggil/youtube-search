import { NextRequest, NextResponse } from 'next/server';
import { TTSService, SubtitleService } from '@/services/tts';
import { db } from '@/lib/db';
import { ContentFormat } from '@/types';

const ttsService = new TTSService();
const subtitleService = new SubtitleService();

/**
 * POST /api/tts/generate - TTS 음성 생성
 * PRD 7단계: ElevenLabs TTS 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      projectId,
      videoId,
      format = 'long',
      voiceId,
      saveToDb = false,
      dbScriptId,
    } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'text is required' },
        { status: 400 }
      );
    }

    if (!projectId || !videoId) {
      return NextResponse.json(
        { success: false, error: 'projectId and videoId are required' },
        { status: 400 }
      );
    }

    console.log(`Generating TTS audio (format: ${format})...`);

    // TTS 생성
    const audioResult = await ttsService.generateAndSaveAudio(
      text,
      projectId,
      videoId,
      format as ContentFormat,
      { voiceId }
    );

    // DB에 저장
    if (saveToDb && dbScriptId) {
      await db.generatedAssets.create({
        scriptId: dbScriptId,
        assetType: 'voice',
        fileName: audioResult.fileName,
        filePath: audioResult.filePath,
        fileSizeBytes: audioResult.fileSize,
        voiceDurationSeconds: audioResult.duration,
        ttsProvider: 'elevenlabs',
        ttsVoiceId: voiceId || process.env.ELEVENLABS_VOICE_ID,
        ttsSpeed: format === 'short' ? 1.15 : 1.0,
        generationStatus: 'completed',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        format,
        ...audioResult,
      },
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
