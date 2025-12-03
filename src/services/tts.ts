import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { ContentFormat, getContentConfig } from '@/types';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel

/**
 * TTS Service (ElevenLabs)
 * PRD 7단계: 음성 합성
 */
export class TTSService {
  private apiKey: string;
  private voiceId: string;
  private storagePath: string;

  constructor(apiKey?: string, voiceId?: string, storagePath?: string) {
    this.apiKey = apiKey || ELEVENLABS_API_KEY || '';
    this.voiceId = voiceId || DEFAULT_VOICE_ID;
    this.storagePath = storagePath || process.env.STORAGE_PATH || './storage';
  }

  /**
   * 텍스트를 음성으로 변환
   */
  async textToSpeech(
    text: string,
    format: ContentFormat = 'long',
    options?: {
      voiceId?: string;
      modelId?: string;
      stability?: number;
      similarityBoost?: number;
    }
  ): Promise<Buffer> {
    const config = getContentConfig(format);
    const voiceId = options?.voiceId || this.voiceId;

    // 포맷에 따른 음성 설정
    // 숏폼: 에너지 높은 톤, 속도 1.1~1.2배
    // 롱폼: 차분하고 신뢰감 있는 톤, 속도 1.0배
    const voiceSettings = {
      stability: options?.stability ?? (format === 'short' ? 0.3 : 0.5),
      similarity_boost: options?.similarityBoost ?? (format === 'short' ? 0.8 : 0.75),
      style: format === 'short' ? 0.5 : 0.3, // 숏폼은 더 스타일리시하게
      use_speaker_boost: true,
    };

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: options?.modelId || 'eleven_multilingual_v2',
        voice_settings: voiceSettings,
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  }

  /**
   * 음성 파일 생성 및 저장
   */
  async generateAndSaveAudio(
    text: string,
    projectId: number,
    videoId: string,
    format: ContentFormat = 'long',
    options?: {
      voiceId?: string;
      fileName?: string;
    }
  ): Promise<{
    fileName: string;
    filePath: string;
    fileSize: number;
    duration: number;
  }> {
    // 디렉토리 생성
    const projectDir = path.join(
      this.storagePath,
      'projects',
      String(projectId),
      videoId,
      'audio'
    );
    await fs.mkdir(projectDir, { recursive: true });

    // 파일명 생성
    const formatSuffix = format === 'short' ? '_shorts' : '';
    const fileName = options?.fileName || `voice${formatSuffix}.mp3`;
    const filePath = path.join(projectDir, fileName);

    // TTS 생성
    const audioBuffer = await this.textToSpeech(text, format, options);

    // 파일 저장
    await fs.writeFile(filePath, audioBuffer);

    const stats = await fs.stat(filePath);

    // 대략적인 음성 길이 계산 (한국어 기준 분당 약 300자)
    const charsPerMinute = format === 'short' ? 350 : 300; // 숏폼은 더 빠름
    const estimatedDuration = (text.length / charsPerMinute) * 60;

    return {
      fileName,
      filePath,
      fileSize: stats.size,
      duration: Math.round(estimatedDuration),
    };
  }

  /**
   * 사용 가능한 음성 목록 조회
   */
  async getVoices(): Promise<Array<{
    voice_id: string;
    name: string;
    category: string;
    labels: Record<string, string>;
  }>> {
    const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    return response.data.voices;
  }

  /**
   * 사용량 확인
   */
  async getUsage(): Promise<{
    character_count: number;
    character_limit: number;
    can_extend_character_limit: boolean;
  }> {
    const response = await axios.get(`${ELEVENLABS_API_URL}/user/subscription`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    return response.data;
  }
}

/**
 * Subtitle Generation Service
 * PRD 7단계: 자막 생성
 */
export class SubtitleService {
  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || process.env.STORAGE_PATH || './storage';
  }

  /**
   * 대본에서 SRT 자막 생성
   * 음성 길이에 맞춰 타이밍 자동 계산
   */
  generateSRT(
    script: string,
    totalDurationSeconds: number,
    format: ContentFormat = 'long'
  ): string {
    const config = getContentConfig(format);
    const lines = this.splitIntoSubtitleLines(script, format);
    const totalChars = lines.reduce((sum, line) => sum + line.length, 0);

    let currentTime = 0;
    const subtitles: string[] = [];

    lines.forEach((line, index) => {
      // 각 라인의 길이에 비례하여 시간 할당
      const lineDuration = (line.length / totalChars) * totalDurationSeconds;
      const startTime = currentTime;
      const endTime = currentTime + lineDuration;

      subtitles.push(
        `${index + 1}\n` +
        `${this.formatSRTTime(startTime)} --> ${this.formatSRTTime(endTime)}\n` +
        `${line}\n`
      );

      currentTime = endTime;
    });

    return subtitles.join('\n');
  }

  /**
   * VTT 형식 자막 생성 (웹용)
   */
  generateVTT(
    script: string,
    totalDurationSeconds: number,
    format: ContentFormat = 'long'
  ): string {
    const config = getContentConfig(format);
    const lines = this.splitIntoSubtitleLines(script, format);
    const totalChars = lines.reduce((sum, line) => sum + line.length, 0);

    let currentTime = 0;
    const subtitles: string[] = ['WEBVTT\n'];

    lines.forEach((line, index) => {
      const lineDuration = (line.length / totalChars) * totalDurationSeconds;
      const startTime = currentTime;
      const endTime = currentTime + lineDuration;

      subtitles.push(
        `${this.formatVTTTime(startTime)} --> ${this.formatVTTTime(endTime)}\n` +
        `${line}\n`
      );

      currentTime = endTime;
    });

    return subtitles.join('\n');
  }

  /**
   * 대본을 자막 라인으로 분할
   * 숏폼: 2-3단어씩, 롱폼: 한 문장 단위
   */
  private splitIntoSubtitleLines(script: string, format: ContentFormat): string[] {
    const lines: string[] = [];

    if (format === 'short') {
      // 숏폼: 짧게 분할 (2-4 단어)
      const words = script.replace(/\n+/g, ' ').split(/\s+/);
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length > 20) {
          if (currentLine) lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      }
      if (currentLine) lines.push(currentLine.trim());
    } else {
      // 롱폼: 문장 단위
      const sentences = script
        .replace(/\n+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim());

      for (const sentence of sentences) {
        // 문장이 너무 길면 분할
        if (sentence.length > 80) {
          const parts = sentence.match(/.{1,80}(?:\s|$)/g) || [sentence];
          lines.push(...parts.map(p => p.trim()));
        } else {
          lines.push(sentence.trim());
        }
      }
    }

    return lines.filter(l => l);
  }

  /**
   * SRT 시간 형식 변환 (00:00:00,000)
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * VTT 시간 형식 변환 (00:00:00.000)
   */
  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  /**
   * 자막 파일 저장
   */
  async saveSubtitle(
    content: string,
    projectId: number,
    videoId: string,
    format: ContentFormat = 'long',
    subtitleFormat: 'srt' | 'vtt' = 'srt'
  ): Promise<{
    fileName: string;
    filePath: string;
    fileSize: number;
    lineCount: number;
  }> {
    // 디렉토리 생성
    const projectDir = path.join(
      this.storagePath,
      'projects',
      String(projectId),
      videoId,
      'subtitles'
    );
    await fs.mkdir(projectDir, { recursive: true });

    // 파일명 생성
    const formatSuffix = format === 'short' ? '_shorts' : '';
    const fileName = `subtitle${formatSuffix}.${subtitleFormat}`;
    const filePath = path.join(projectDir, fileName);

    // 파일 저장
    await fs.writeFile(filePath, content, 'utf-8');

    const stats = await fs.stat(filePath);
    const lineCount = content.split('\n\n').filter(block => block.trim()).length;

    return {
      fileName,
      filePath,
      fileSize: stats.size,
      lineCount,
    };
  }
}

/**
 * TTS 설정 정보 (PRD 스펙)
 */
export function getTTSSpecs(format: ContentFormat): {
  speed: number;
  tone: string;
  description: string;
} {
  const config = getContentConfig(format);

  return {
    speed: config.tts.speed,
    tone: config.tts.tone === 'energetic' ? '에너지 높은 톤' : '차분하고 신뢰감 있는 톤',
    description: format === 'short'
      ? '빠른 속도 (1.1~1.2배), 에너지 높은 톤'
      : '보통 속도 (1.0배), 차분하고 신뢰감 있는 톤',
  };
}

/**
 * 자막 스타일 정보 (PRD 스펙)
 */
export function getSubtitleSpecs(format: ContentFormat): {
  position: string;
  fontSize: number;
  unit: string;
  effect: string;
} {
  const config = getContentConfig(format);

  return {
    position: config.subtitles.position === 'center' ? '화면 중앙 배치' : '화면 하단 고정',
    fontSize: config.subtitles.fontSize,
    unit: format === 'short' ? '한 번에 2-3단어씩' : '한 문장 단위',
    effect: format === 'short' ? '강조 색상, 애니메이션' : '반투명 배경',
  };
}

export default TTSService;
