import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { ContentFormat, getContentConfig } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '***REMOVED***';

/**
 * Image Generation Service
 * PRD 6단계: 이미지 생성 (실사 스타일)
 *
 * Gemini Image Model: models/gemini-3-pro-preview
 */
export class ImageGenerationService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private storagePath: string;

  constructor(apiKey?: string, storagePath?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey || GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'models/gemini-3-pro-preview' });
    this.storagePath = storagePath || process.env.STORAGE_PATH || './storage';
  }

  /**
   * Gemini Image로 이미지 생성
   */
  async generateImage(
    prompt: string,
    format: ContentFormat = 'long',
    options?: {
      quality?: 'standard' | 'hd';
      style?: 'vivid' | 'natural';
    }
  ): Promise<{
    base64: string;
    mimeType: string;
    revisedPrompt: string;
  }> {
    const aspectRatio = format === 'short' ? '9:16 vertical portrait' : '16:9 horizontal landscape';
    const styleDesc = options?.style === 'vivid' ? 'vibrant, eye-catching colors' : 'natural, realistic colors';
    const qualityDesc = options?.quality === 'hd' ? '8K ultra high resolution' : 'high quality 4K resolution';

    const enhancedPrompt = `${prompt}

Image specifications:
- Aspect ratio: ${aspectRatio}
- Style: photorealistic, ${styleDesc}
- Quality: ${qualityDesc}
- Professional photography style
- High detail and clarity`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Generate an image: ${enhancedPrompt}` }] }],
        generationConfig: {
          responseModalities: ['image', 'text'],
        },
      });

      const response = await result.response;
      const parts = response.candidates?.[0]?.content?.parts || [];

      // Find image part in response
      for (const part of parts) {
        if (part.inlineData) {
          return {
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
            revisedPrompt: enhancedPrompt,
          };
        }
      }

      throw new Error('No image generated in response');
    } catch (error: any) {
      console.error('Gemini image generation error:', error);
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  /**
   * 여러 이미지 생성 (배치)
   */
  async generateImages(
    prompts: string[],
    format: ContentFormat = 'long',
    options?: {
      quality?: 'standard' | 'hd';
      style?: 'vivid' | 'natural';
    }
  ): Promise<Array<{
    index: number;
    base64?: string;
    mimeType?: string;
    revisedPrompt: string;
    error?: string;
  }>> {
    const results = [];

    for (let i = 0; i < prompts.length; i++) {
      try {
        const result = await this.generateImage(prompts[i], format, options);
        results.push({
          index: i,
          base64: result.base64,
          mimeType: result.mimeType,
          revisedPrompt: result.revisedPrompt,
        });

        // API 레이트 리밋 방지를 위한 딜레이
        if (i < prompts.length - 1) {
          await this.delay(2000);
        }
      } catch (error: any) {
        console.error(`Error generating image ${i}:`, error.message);
        results.push({
          index: i,
          revisedPrompt: prompts[i],
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Base64 이미지를 파일로 저장
   */
  async saveBase64Image(
    base64Data: string,
    mimeType: string,
    projectId: number,
    videoId: string,
    index: number,
    format: ContentFormat = 'long'
  ): Promise<{
    fileName: string;
    filePath: string;
    fileSize: number;
  }> {
    // 디렉토리 생성
    const projectDir = path.join(
      this.storagePath,
      'projects',
      String(projectId),
      videoId,
      'images'
    );
    await fs.mkdir(projectDir, { recursive: true });

    // 확장자 결정
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') ? 'jpg' : 'png';

    // 파일명 생성
    const formatSuffix = format === 'short' ? '_shorts' : '';
    const fileName = `img_${String(index + 1).padStart(2, '0')}${formatSuffix}.${ext}`;
    const filePath = path.join(projectDir, fileName);

    // Base64를 Buffer로 변환하여 저장
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, buffer);

    const stats = await fs.stat(filePath);

    return {
      fileName,
      filePath,
      fileSize: stats.size,
    };
  }

  /**
   * 대본에서 자동으로 이미지 프롬프트 추출 및 생성
   */
  async generateImagesFromScript(
    script: string,
    prompts: string[],
    projectId: number,
    videoId: string,
    format: ContentFormat = 'long'
  ): Promise<Array<{
    index: number;
    prompt: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    error?: string;
  }>> {
    const results = [];

    // 이미지 생성
    const generatedImages = await this.generateImages(prompts, format);

    // 각 이미지 저장
    for (const img of generatedImages) {
      if (img.error || !img.base64) {
        results.push({
          index: img.index,
          prompt: prompts[img.index],
          fileName: '',
          filePath: '',
          fileSize: 0,
          error: img.error || 'No image data returned',
        });
        continue;
      }

      try {
        const saved = await this.saveBase64Image(
          img.base64,
          img.mimeType || 'image/png',
          projectId,
          videoId,
          img.index,
          format
        );

        results.push({
          index: img.index,
          prompt: prompts[img.index],
          ...saved,
        });
      } catch (error: any) {
        results.push({
          index: img.index,
          prompt: prompts[img.index],
          fileName: '',
          filePath: '',
          fileSize: 0,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * 썸네일 생성 (특별히 임팩트 있는 이미지)
   */
  async generateThumbnail(
    script: string,
    thumbnailText: string,
    format: ContentFormat = 'long'
  ): Promise<{
    base64: string;
    mimeType: string;
    revisedPrompt: string;
  }> {
    const aspectRatio = format === 'short' ? 'vertical 9:16' : 'horizontal 16:9';

    const thumbnailPrompt = `YouTube thumbnail, ${aspectRatio}, eye-catching, vibrant colors,
professional quality, clear focal point, suitable for text overlay "${thumbnailText}",
photorealistic, high contrast, engaging, clickbait style but professional`;

    return this.generateImage(thumbnailPrompt, format, {
      quality: 'hd',
      style: 'vivid',
    });
  }

  /**
   * 캐릭터 이미지 생성
   */
  async generateCharacterImage(
    character: {
      name: string;
      type: string;
      personality: string;
      appearance?: string;
    },
    format: ContentFormat = 'long'
  ): Promise<{
    base64: string;
    mimeType: string;
    revisedPrompt: string;
  }> {
    const appearanceDesc = character.appearance || `${character.type} with ${character.personality} personality`;

    const characterPrompt = `Character portrait for YouTube video:
- Name: ${character.name}
- Type: ${character.type}
- Personality: ${character.personality}
- Appearance: ${appearanceDesc}

Style: photorealistic, professional headshot or medium shot,
warm lighting, friendly expression, high quality, suitable for video content`;

    return this.generateImage(characterPrompt, format, {
      quality: 'hd',
      style: 'natural',
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 이미지 해상도 정보 가져오기 (PRD 스펙)
 */
export function getImageSpecs(format: ContentFormat): {
  aspectRatio: string;
  resolution: string;
  width: number;
  height: number;
  count: number;
  style: string;
} {
  const config = getContentConfig(format);

  return {
    aspectRatio: config.video.aspectRatio,
    resolution: config.video.resolution,
    width: format === 'short' ? 1080 : 1920,
    height: format === 'short' ? 1920 : 1080,
    count: config.images.count,
    style: config.images.style === 'closeup' ? '클로즈업 위주' : '미디엄/와이드샷 혼합',
  };
}

export default ImageGenerationService;
