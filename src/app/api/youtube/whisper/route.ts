import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { GoogleGenerativeAI } from '@google/generative-ai';

const execAsync = promisify(exec);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// YouTube URL에서 비디오 ID 추출
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// yt-dlp로 오디오 다운로드
async function downloadAudio(videoId: string, outputDir: string, outputName: string): Promise<string> {
  const ytdlpPath = process.env.YTDLP_PATH || '/home/nbg/.local/bin/yt-dlp';
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const outputTemplate = path.join(outputDir, outputName);
  const expectedOutput = `${outputTemplate}.mp3`;

  // 오디오만 추출 (mp3 형식, 낮은 비트레이트로 파일 크기 축소)
  // 32kbps, 16kHz, 모노 = 음성 인식에 충분하면서 파일 크기 최소화
  const command = `${ytdlpPath} -x --audio-format mp3 --postprocessor-args "-b:a 32k -ar 16000 -ac 1" -o "${outputTemplate}.%(ext)s" --no-playlist "${videoUrl}"`;

  try {
    console.log(`Running: ${command}`);
    const { stdout, stderr } = await execAsync(command, { timeout: 300000 }); // 5분 타임아웃
    console.log('yt-dlp stdout:', stdout);
    if (stderr) console.log('yt-dlp stderr:', stderr);

    // 파일 존재 확인
    try {
      await fs.access(expectedOutput);
      return expectedOutput;
    } catch {
      const files = await fs.readdir(outputDir);
      const audioFile = files.find(f => f.startsWith(outputName) && (f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.webm')));
      if (audioFile) {
        return path.join(outputDir, audioFile);
      }
      throw new Error(`오디오 파일을 찾을 수 없습니다. Expected: ${expectedOutput}`);
    }
  } catch (error: any) {
    console.error('yt-dlp error:', error);
    throw new Error(`오디오 다운로드 실패: ${error.message}`);
  }
}

// Gemini로 음성 인식
async function transcribeWithGemini(audioPath: string, language: string = 'ko'): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  // Gemini 2.0 Flash 모델 사용 (오디오 지원, 빠른 처리)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // 오디오 파일 읽기
  const audioBuffer = await fs.readFile(audioPath);
  const base64Audio = audioBuffer.toString('base64');

  // 파일 확장자로 MIME 타입 결정
  const ext = path.extname(audioPath).toLowerCase();
  const mimeType = ext === '.mp3' ? 'audio/mp3' :
                   ext === '.m4a' ? 'audio/mp4' :
                   ext === '.webm' ? 'audio/webm' : 'audio/mpeg';

  const languageName = language === 'ko' ? '한국어' :
                       language === 'en' ? '영어' :
                       language === 'ja' ? '일본어' : '한국어';

  const prompt = `이 오디오 파일의 음성을 ${languageName}로 정확하게 텍스트로 변환해주세요.
말하는 내용만 그대로 텍스트로 옮겨주세요.
타임스탬프나 화자 구분 없이 순수한 텍스트만 출력해주세요.
음악이나 효과음은 무시하고 말하는 내용만 적어주세요.`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error: any) {
    console.error('Gemini transcription error:', error);
    throw new Error(`Gemini 음성 인식 오류: ${error.message}`);
  }
}

// 임시 파일 정리
async function cleanup(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (e) {
    // 파일이 없어도 무시
  }
}

export async function POST(request: NextRequest) {
  let tempAudioPath = '';

  try {
    const body = await request.json();
    const { url, language = 'ko' } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'YouTube URL이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: '음성 인식을 사용하려면 GEMINI_API_KEY가 필요합니다.' },
        { status: 500 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '유효한 YouTube URL이 아닙니다.' },
        { status: 400 }
      );
    }

    // 임시 파일 경로 생성
    const tempDir = os.tmpdir();
    const outputName = `youtube_${videoId}_${Date.now()}`;

    // 1단계: 오디오 다운로드
    console.log(`Downloading audio for video: ${videoId}`);
    tempAudioPath = await downloadAudio(videoId, tempDir, outputName);

    // 파일 존재 확인
    const stats = await fs.stat(tempAudioPath);
    const fileSizeMB = stats.size / 1024 / 1024;
    console.log(`Audio file size: ${fileSizeMB.toFixed(2)}MB`);

    // Gemini 인라인 데이터 최대 20MB
    // 32kbps 모노 오디오 = 약 2시간 분량 처리 가능
    if (stats.size > 20 * 1024 * 1024) {
      await cleanup(tempAudioPath);
      return NextResponse.json(
        { success: false, error: '영상이 너무 깁니다. 약 2시간 이하의 영상만 처리 가능합니다.' },
        { status: 400 }
      );
    }

    // 2단계: Gemini로 음성 인식
    console.log('Transcribing with Gemini...');
    const transcript = await transcribeWithGemini(tempAudioPath, language);

    // 정리
    await cleanup(tempAudioPath);

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '음성 인식 결과가 없습니다. 영상에 음성이 없거나 인식할 수 없습니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        transcript: transcript.trim(),
        transcriptType: 'gemini',
        language,
        characterCount: transcript.length,
      },
    });
  } catch (error: any) {
    console.error('Gemini transcription error:', error);

    // 임시 파일 정리
    if (tempAudioPath) {
      await cleanup(tempAudioPath);
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '음성 인식 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
