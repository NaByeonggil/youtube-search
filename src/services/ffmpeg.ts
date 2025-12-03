import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { ContentFormat, getContentConfig } from '@/types';

const execAsync = promisify(exec);

/**
 * FFmpeg Video Service
 * PRD 7단계: 영상 제작 (이미지 + 음성 + 자막)
 */
export class FFmpegService {
  private storagePath: string;
  private ffmpegPath: string;

  constructor(storagePath?: string, ffmpegPath?: string) {
    this.storagePath = storagePath || process.env.STORAGE_PATH || './storage';
    this.ffmpegPath = ffmpegPath || 'ffmpeg';
  }

  /**
   * 이미지 + 음성 + 자막 합성하여 영상 생성
   */
  async createVideo(
    projectId: number,
    videoId: string,
    format: ContentFormat = 'long',
    options?: {
      images: string[];      // 이미지 파일 경로 배열
      audioPath: string;     // 음성 파일 경로
      subtitlePath?: string; // 자막 파일 경로 (선택)
      outputFileName?: string;
    }
  ): Promise<{
    fileName: string;
    filePath: string;
    fileSize: number;
    duration: number;
  }> {
    const config = getContentConfig(format);
    const { images, audioPath, subtitlePath, outputFileName } = options || { images: [], audioPath: '' };

    // 출력 디렉토리 생성
    const outputDir = path.join(
      this.storagePath,
      'projects',
      String(projectId),
      videoId,
      'video'
    );
    await fs.mkdir(outputDir, { recursive: true });

    // 파일명 생성
    const formatSuffix = format === 'short' ? '_shorts' : '';
    const fileName = outputFileName || `final${formatSuffix}.mp4`;
    const filePath = path.join(outputDir, fileName);

    // 임시 디렉토리 생성
    const tempDir = path.join(this.storagePath, 'temp', `${projectId}_${videoId}_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // 1. 오디오 길이 확인
      const audioDuration = await this.getAudioDuration(audioPath);

      // 2. 이미지별 표시 시간 계산
      const imageDuration = audioDuration / images.length;

      // 3. 이미지 리스트 파일 생성 (FFmpeg concat용)
      const imageListPath = path.join(tempDir, 'images.txt');
      const imageList = images
        .map(img => `file '${path.resolve(img)}'\nduration ${imageDuration}`)
        .join('\n');
      // 마지막 이미지 추가 (FFmpeg concat demuxer 요구사항)
      const imageListContent = imageList + `\nfile '${path.resolve(images[images.length - 1])}'`;
      await fs.writeFile(imageListPath, imageListContent);

      // 4. 영상 해상도 및 설정
      const resolution = config.video.resolution;
      const [width, height] = resolution.split('x').map(Number);
      const fps = 30;

      // 5. FFmpeg 명령어 구성
      let filterComplex = '';
      let inputArgs = `-f concat -safe 0 -i "${imageListPath}" -i "${audioPath}"`;

      // Ken Burns 효과 (줌/패닝)
      if (format === 'short') {
        // 숏폼: 빠른 줌 효과
        filterComplex = `[0:v]scale=${width * 1.2}:${height * 1.2},zoompan=z='min(zoom+0.002,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.ceil(imageDuration * fps)}:s=${width}x${height}:fps=${fps}[v]`;
      } else {
        // 롱폼: 부드러운 Ken Burns
        filterComplex = `[0:v]scale=${width * 1.1}:${height * 1.1},zoompan=z='if(lte(zoom,1.0),1.05,max(1.001,zoom-0.0005))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.ceil(imageDuration * fps)}:s=${width}x${height}:fps=${fps}[v]`;
      }

      // 자막 추가 (있는 경우)
      let subtitleFilter = '';
      if (subtitlePath) {
        const subtitleStyle = this.getSubtitleStyle(format);
        subtitleFilter = `,subtitles='${subtitlePath.replace(/'/g, "\\'")}':force_style='${subtitleStyle}'`;
        filterComplex = filterComplex.replace('[v]', `${subtitleFilter}[v]`);
      }

      // 6. FFmpeg 실행
      const ffmpegCmd = `${this.ffmpegPath} -y ${inputArgs} \
        -filter_complex "${filterComplex}" \
        -map "[v]" -map 1:a \
        -c:v libx264 -preset fast -crf 23 \
        -c:a aac -b:a 128k \
        -r ${fps} \
        -pix_fmt yuv420p \
        -movflags +faststart \
        "${filePath}"`;

      console.log('Executing FFmpeg command:', ffmpegCmd);
      await execAsync(ffmpegCmd);

      // 7. 결과 파일 정보
      const stats = await fs.stat(filePath);
      const duration = await this.getVideoDuration(filePath);

      return {
        fileName,
        filePath,
        fileSize: stats.size,
        duration,
      };
    } finally {
      // 임시 파일 정리
      try {
        await fs.rm(tempDir, { recursive: true });
      } catch (e) {
        console.error('Error cleaning temp directory:', e);
      }
    }
  }

  /**
   * 간단한 영상 생성 (이미지 슬라이드쇼)
   */
  async createSlideshow(
    images: string[],
    audioPath: string,
    outputPath: string,
    format: ContentFormat = 'long'
  ): Promise<void> {
    const config = getContentConfig(format);
    const resolution = config.video.resolution;
    const [width, height] = resolution.split('x').map(Number);

    const audioDuration = await this.getAudioDuration(audioPath);
    const imageDuration = audioDuration / images.length;

    // 이미지 입력 구성
    const inputs = images.map(img => `-loop 1 -t ${imageDuration} -i "${img}"`).join(' ');
    const filterInputs = images.map((_, i) => `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`).join(';');
    const concat = images.map((_, i) => `[v${i}]`).join('') + `concat=n=${images.length}:v=1:a=0[outv]`;

    const ffmpegCmd = `${this.ffmpegPath} -y ${inputs} -i "${audioPath}" \
      -filter_complex "${filterInputs};${concat}" \
      -map "[outv]" -map ${images.length}:a \
      -c:v libx264 -preset fast -crf 23 \
      -c:a aac -b:a 128k \
      -pix_fmt yuv420p \
      -movflags +faststart \
      "${outputPath}"`;

    await execAsync(ffmpegCmd);
  }

  /**
   * 플랫폼별 영상 최적화 (리사이징, 길이 조정 등)
   */
  async optimizeForPlatform(
    inputPath: string,
    outputPath: string,
    platform: {
      maxDurationSeconds: number;
      maxFileSizeMb: number;
      resolution: string;
    }
  ): Promise<void> {
    const [width, height] = platform.resolution.split('x').map(Number);

    const ffmpegCmd = `${this.ffmpegPath} -y -i "${inputPath}" \
      -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" \
      -t ${platform.maxDurationSeconds} \
      -c:v libx264 -preset medium -crf 23 \
      -c:a aac -b:a 128k \
      -fs ${platform.maxFileSizeMb}M \
      -movflags +faststart \
      "${outputPath}"`;

    await execAsync(ffmpegCmd);
  }

  /**
   * 오디오 길이 확인
   */
  async getAudioDuration(audioPath: string): Promise<number> {
    const { stdout } = await execAsync(
      `${this.ffmpegPath.replace('ffmpeg', 'ffprobe')} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    return parseFloat(stdout.trim());
  }

  /**
   * 영상 길이 확인
   */
  async getVideoDuration(videoPath: string): Promise<number> {
    const { stdout } = await execAsync(
      `${this.ffmpegPath.replace('ffmpeg', 'ffprobe')} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    return Math.round(parseFloat(stdout.trim()));
  }

  /**
   * 자막 스타일 생성
   */
  private getSubtitleStyle(format: ContentFormat): string {
    const config = getContentConfig(format);

    if (format === 'short') {
      // 숏폼: 중앙 배치, 큰 폰트, 강조 색상
      return 'FontName=Arial,FontSize=56,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,Alignment=10,MarginV=100';
    } else {
      // 롱폼: 하단 고정, 일반 폰트, 반투명 배경
      return 'FontName=Arial,FontSize=36,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=4,Outline=0,Shadow=0,Alignment=2,MarginV=30';
    }
  }

  /**
   * 썸네일 추출
   */
  async extractThumbnail(
    videoPath: string,
    outputPath: string,
    timeSeconds = 1
  ): Promise<void> {
    const ffmpegCmd = `${this.ffmpegPath} -y -i "${videoPath}" -ss ${timeSeconds} -vframes 1 -q:v 2 "${outputPath}"`;
    await execAsync(ffmpegCmd);
  }

  /**
   * FFmpeg 설치 확인
   */
  async checkInstallation(): Promise<boolean> {
    try {
      await execAsync(`${this.ffmpegPath} -version`);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 영상 스펙 정보 (PRD 스펙)
 */
export function getVideoSpecs(format: ContentFormat): {
  resolution: string;
  aspectRatio: string;
  fps: number;
  codec: string;
  maxDuration: number;
  transitionStyle: string;
  transitionInterval: string;
} {
  const config = getContentConfig(format);

  return {
    resolution: config.video.resolution,
    aspectRatio: config.video.aspectRatio,
    fps: 30,
    codec: 'H.264',
    maxDuration: config.video.maxDuration,
    transitionStyle: format === 'short'
      ? '빠른 컷 전환 + 줌 효과'
      : '부드러운 전환 + Ken Burns 효과',
    transitionInterval: format === 'short'
      ? '2~5초 간격'
      : '5~15초 간격',
  };
}

export default FFmpegService;
