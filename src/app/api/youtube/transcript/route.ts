import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

// YouTube URL에서 비디오 ID 추출
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // 직접 ID 입력
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// 자막 텍스트 포맷팅
function formatTranscript(
  transcriptItems: Array<{ text: string; offset: number; duration: number }>
): string {
  // 자막 아이템들을 텍스트로 합치기
  const text = transcriptItems
    .map((item) => item.text.trim())
    .filter((text) => text.length > 0)
    .join(' ');

  // 연속된 공백 제거 및 정리
  return text
    .replace(/\s+/g, ' ')
    .replace(/\[음악\]/gi, '')
    .replace(/\[박수\]/gi, '')
    .replace(/\[웃음\]/gi, '')
    .trim();
}

// 타임스탬프 포함 포맷
function formatTranscriptWithTimestamps(
  transcriptItems: Array<{ text: string; offset: number; duration: number }>
): string {
  return transcriptItems
    .map((item) => {
      const minutes = Math.floor(item.offset / 60000);
      const seconds = Math.floor((item.offset % 60000) / 1000);
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      return `[${timestamp}] ${item.text.trim()}`;
    })
    .filter((line) => line.length > 10)
    .join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, includeTimestamps = false, language = 'ko' } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'YouTube URL이 필요합니다.' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '유효한 YouTube URL이 아닙니다.' },
        { status: 400 }
      );
    }

    // 자막 추출 시도 (한국어 우선, 없으면 영어, 없으면 자동 생성)
    let transcript = null;
    let usedLanguage = language;
    let transcriptType = 'manual'; // manual or auto

    const languagePriority = [language, 'ko', 'en', 'ja', 'zh'];

    for (const lang of languagePriority) {
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: lang,
        });
        if (transcript && transcript.length > 0) {
          usedLanguage = lang;
          break;
        }
      } catch (e) {
        // 해당 언어 자막 없음, 다음 시도
        continue;
      }
    }

    // 자막을 찾지 못한 경우
    if (!transcript || transcript.length === 0) {
      return NextResponse.json({
        success: false,
        error: '자막을 찾을 수 없습니다.',
        videoId,
        needsWhisper: true, // Whisper STT 필요 플래그
        message: '이 영상에는 자막이 없습니다. 음성 인식(Whisper)을 사용하시겠습니까?',
      });
    }

    // 자막 포맷팅
    const formattedText = includeTimestamps
      ? formatTranscriptWithTimestamps(transcript)
      : formatTranscript(transcript);

    // 영상 길이 계산 (마지막 자막 기준)
    const lastItem = transcript[transcript.length - 1];
    const durationSeconds = Math.ceil((lastItem.offset + lastItem.duration) / 1000);
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationSecondsRemainder = durationSeconds % 60;

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        transcript: formattedText,
        language: usedLanguage,
        transcriptType,
        itemCount: transcript.length,
        characterCount: formattedText.length,
        estimatedDuration: `${durationMinutes}분 ${durationSecondsRemainder}초`,
        rawItems: includeTimestamps ? undefined : transcript.slice(0, 5), // 미리보기용
      },
    });
  } catch (error: any) {
    console.error('YouTube transcript error:', error);

    // 자막 비활성화 또는 접근 불가
    if (error.message?.includes('disabled') || error.message?.includes('unavailable')) {
      return NextResponse.json({
        success: false,
        error: '이 영상의 자막이 비활성화되어 있거나 접근할 수 없습니다.',
        needsWhisper: true,
        message: '자막이 비활성화되어 있습니다. 음성 인식(Whisper)을 사용하시겠습니까?',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '자막 추출 중 오류가 발생했습니다.',
        needsWhisper: true,
      },
      { status: 500 }
    );
  }
}
