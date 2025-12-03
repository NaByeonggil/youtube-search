import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { ContentFormat } from '@/types';

export interface VideoGenerationOptions {
  aspectRatio?: '16:9' | '9:16';
  duration?: number; // seconds (5-8 for current limits)
  numberOfImages?: number;
  prompt?: string;
}

export interface VideoGenerationResult {
  success: boolean;
  videoData?: string; // base64 encoded video
  mimeType?: string;
  duration?: number;
  filePath?: string;
  error?: string;
  operationName?: string;
  status?: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachedImages?: Array<{
    base64: string;
    mimeType: string;
  }>;
}

export interface VideoChatResponse {
  response: string;
  videoPrompt?: string;
  style?: string;
  attachedImageAnalysis?: string;
  readyToGenerate: boolean;
  suggestedDuration?: number;
}

/**
 * Video Generation Service
 * Veo 3.1 모델을 사용한 영상 생성 서비스
 *
 * 모델: veo-3.1-generate-preview
 * - 이미지 + 텍스트 프롬프트로 영상 생성
 * - 5-8초 짧은 영상 생성 가능
 * - 16:9, 9:16 비율 지원
 */
export class VideoGenerationService {
  private genAI: GoogleGenerativeAI;
  private chatModel: any;
  private veoModel: any;
  private storagePath: string;

  constructor(apiKey?: string, storagePath?: string) {
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!finalApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(finalApiKey);

    // 채팅용 모델 (이미지 분석, 프롬프트 생성)
    this.chatModel = this.genAI.getGenerativeModel({
      model: 'gemini-3-pro-preview'
    });

    // 영상 생성용 Veo 모델
    this.veoModel = this.genAI.getGenerativeModel({
      model: 'veo-3.1-generate-preview'
    });

    this.storagePath = storagePath || process.env.STORAGE_PATH || './storage';
  }

  /**
   * 채팅 응답 생성 (이미지 분석 포함)
   * 사용자의 요청을 분석하고 영상 생성을 위한 프롬프트 생성
   */
  async generateChatResponse(
    messages: ChatMessage[],
    attachedImages?: Array<{ base64: string; mimeType: string }>
  ): Promise<VideoChatResponse> {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('No user message found');
    }

    const systemPrompt = `당신은 전문 영상 생성 어시스턴트입니다.
사용자가 원하는 영상을 설명하면, 다음을 수행하세요:

1. 사용자의 요청을 이해하고 구체적인 영상 생성 프롬프트를 작성하세요
2. 첨부된 이미지가 있다면 분석하여 영상의 시작점으로 활용하세요
3. 유튜브/틱톡 콘텐츠에 적합한 고품질 영상을 위한 프롬프트를 제안하세요

Veo 3.1 모델 특성:
- 5-8초 길이의 영상 생성 가능
- 이미지를 기반으로 움직임 추가 가능
- 16:9 (가로) 또는 9:16 (세로) 비율 지원
- 포토리얼리스틱 또는 시네마틱 스타일

응답 형식 (JSON):
{
  "response": "사용자에게 보여줄 친절한 응답 메시지",
  "videoPrompt": "영상 생성을 위한 상세한 영문 프롬프트 (카메라 움직임, 조명, 분위기 포함)",
  "style": "cinematic, photorealistic, dynamic, slow-motion 등",
  "attachedImageAnalysis": "첨부 이미지 분석 결과 (첨부된 경우)",
  "readyToGenerate": true/false,
  "suggestedDuration": 5-8 (추천 영상 길이 초)
}

항상 JSON 형식으로만 응답하세요. videoPrompt는 영어로 작성하세요.
카메라 움직임(pan, zoom, dolly), 조명 변화, 피사체 움직임을 구체적으로 설명하세요.`;

    // 컨텐츠 파츠 구성
    const parts: any[] = [
      { text: systemPrompt + '\n\n사용자 요청: ' + lastUserMessage.content },
    ];

    // 첨부 이미지 추가
    if (attachedImages && attachedImages.length > 0) {
      for (const img of attachedImages) {
        if (img.base64 && img.mimeType) {
          parts.push({
            inlineData: {
              data: img.base64,
              mimeType: img.mimeType,
            },
          });
        }
      }
      parts.push({
        text: '\n\n위 이미지를 분석하고, 이 이미지를 시작점으로 하는 영상을 생성하기 위한 프롬프트를 제안해주세요.'
      });
    }

    // 대화 히스토리 추가
    const historyContext = messages.slice(0, -1)
      .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n');

    if (historyContext) {
      parts.unshift({ text: '이전 대화:\n' + historyContext + '\n\n' });
    }

    const result = await this.chatModel.generateContent({
      contents: [{ role: 'user', parts }],
    });

    const aiResponse = result.response.text();

    // JSON 파싱
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                       aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      return JSON.parse(jsonStr);
    } catch {
      return {
        response: aiResponse,
        readyToGenerate: false,
      };
    }
  }

  /**
   * Veo 3.1로 영상 생성
   * 프롬프트와 선택적 이미지를 기반으로 영상 생성
   */
  async generateVideo(
    prompt: string,
    options: VideoGenerationOptions = {},
    referenceImage?: { base64: string; mimeType: string }
  ): Promise<VideoGenerationResult> {
    try {
      const aspectRatio = options.aspectRatio || '16:9';
      const duration = options.duration || 5;

      // 프롬프트 강화
      const enhancedPrompt = `${prompt}

Video specifications:
- Aspect ratio: ${aspectRatio}
- Duration: ${duration} seconds
- Style: cinematic, high quality, smooth motion
- Camera: professional cinematography
- Lighting: natural, well-balanced`;

      // 컨텐츠 구성
      const parts: any[] = [{ text: enhancedPrompt }];

      // 참조 이미지가 있는 경우 추가
      if (referenceImage) {
        parts.push({
          inlineData: {
            data: referenceImage.base64,
            mimeType: referenceImage.mimeType,
          },
        });
        parts.push({
          text: 'Generate a video starting from this image, following the prompt above.'
        });
      }

      // Veo 모델로 영상 생성
      const result = await this.veoModel.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['video'],
        },
      });

      const response = await result.response;
      const candidates = response.candidates || [];

      // 영상 데이터 추출
      for (const candidate of candidates) {
        const content = candidate.content;
        if (content && content.parts) {
          for (const part of content.parts) {
            if (part.inlineData && part.inlineData.mimeType?.startsWith('video/')) {
              return {
                success: true,
                videoData: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
                duration: duration,
                status: 'SUCCEEDED',
              };
            }
          }
        }
      }

      // 비동기 생성의 경우 operation name 반환
      const operationName = response.operationName || response.name;
      if (operationName) {
        return {
          success: true,
          operationName,
          status: 'PENDING',
          duration: duration,
        };
      }

      return {
        success: false,
        error: 'No video data in response',
        status: 'FAILED',
      };
    } catch (error: any) {
      console.error('Veo video generation error:', error);
      return {
        success: false,
        error: error.message,
        status: 'FAILED',
      };
    }
  }

  /**
   * 영상 생성 상태 확인 (비동기 생성 시)
   */
  async checkVideoStatus(operationName: string): Promise<VideoGenerationResult> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      // Google AI API를 통해 operation 상태 확인
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
      );

      const data = await response.json();

      if (data.done) {
        if (data.response && data.response.candidates) {
          for (const candidate of data.response.candidates) {
            if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('video/')) {
                  return {
                    success: true,
                    videoData: part.inlineData.data,
                    mimeType: part.inlineData.mimeType,
                    status: 'SUCCEEDED',
                  };
                }
              }
            }
          }
        }

        if (data.error) {
          return {
            success: false,
            error: data.error.message,
            status: 'FAILED',
          };
        }
      }

      return {
        success: true,
        operationName,
        status: data.metadata?.state || 'RUNNING',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        status: 'FAILED',
      };
    }
  }

  /**
   * Base64 영상을 파일로 저장
   */
  async saveVideo(
    base64Data: string,
    mimeType: string,
    projectId: number,
    videoId: string,
    filename?: string
  ): Promise<{
    fileName: string;
    filePath: string;
    fileSize: number;
  }> {
    const projectDir = path.join(
      this.storagePath,
      'projects',
      String(projectId),
      videoId,
      'videos'
    );
    await fs.mkdir(projectDir, { recursive: true });

    const ext = mimeType.includes('mp4') ? 'mp4' :
                mimeType.includes('webm') ? 'webm' : 'mp4';
    const timestamp = Date.now();
    const fileName = filename || `video_${timestamp}.${ext}`;
    const filePath = path.join(projectDir, fileName);

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
   * 이미지에서 영상 생성 (Image-to-Video)
   */
  async generateVideoFromImage(
    image: { base64: string; mimeType: string },
    prompt: string,
    options: VideoGenerationOptions = {}
  ): Promise<VideoGenerationResult> {
    const enhancedPrompt = prompt ||
      'Generate a smooth, cinematic video with subtle camera movement and natural motion';

    return this.generateVideo(enhancedPrompt, options, image);
  }

  /**
   * 여러 이미지로 영상 시퀀스 생성
   */
  async generateVideoSequence(
    images: Array<{ base64: string; mimeType: string; prompt?: string }>,
    globalPrompt: string,
    options: VideoGenerationOptions = {}
  ): Promise<VideoGenerationResult[]> {
    const results: VideoGenerationResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const prompt = img.prompt || `${globalPrompt} - Scene ${i + 1}`;

      try {
        const result = await this.generateVideoFromImage(img, prompt, options);
        results.push(result);

        // API 레이트 리밋 방지
        if (i < images.length - 1) {
          await this.delay(3000);
        }
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          status: 'FAILED',
        });
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default VideoGenerationService;
