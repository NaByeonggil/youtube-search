import { NextRequest, NextResponse } from 'next/server';
import {
  VideoGenerationService,
  ChatMessage,
  VideoGenerationOptions
} from '@/services/videoGen';
import { ContentFormat } from '@/types';

const videoService = new VideoGenerationService();

/**
 * POST /api/video/chat - 영상 생성 채팅 (이미지 첨부 지원)
 * Veo 3.1 모델을 사용한 영상 생성
 *
 * 요청 본문:
 * - messages: ChatMessage[] - 대화 히스토리
 * - attachedImages: Array<{base64, mimeType}> - 첨부 이미지
 * - generateVideo: boolean - 영상 생성 실행 여부
 * - format: 'short' | 'long' - 영상 형식
 * - projectId: number - 프로젝트 ID (저장용)
 * - videoId: string - 영상 ID (저장용)
 * - options: VideoGenerationOptions - 생성 옵션
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      attachedImages = [],
      generateVideo = false,
      format = 'long',
      projectId,
      videoId,
      options = {},
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'messages array is required' },
        { status: 400 }
      );
    }

    // 채팅 응답 생성
    const chatResponse = await videoService.generateChatResponse(
      messages as ChatMessage[],
      attachedImages
    );

    let generatedVideo = null;

    // 영상 생성 요청이 있고, 프롬프트가 준비된 경우
    if (generateVideo && chatResponse.videoPrompt && chatResponse.readyToGenerate) {
      try {
        // 비율 결정
        const aspectRatio = format === 'short' ? '9:16' : '16:9' as const;

        const videoOptions: VideoGenerationOptions = {
          aspectRatio,
          duration: chatResponse.suggestedDuration || options.duration || 5,
          ...options,
        };

        // 첨부 이미지가 있으면 Image-to-Video, 없으면 Text-to-Video
        let videoResult;
        if (attachedImages && attachedImages.length > 0) {
          videoResult = await videoService.generateVideoFromImage(
            attachedImages[0],
            chatResponse.videoPrompt,
            videoOptions
          );
        } else {
          videoResult = await videoService.generateVideo(
            chatResponse.videoPrompt,
            videoOptions
          );
        }

        if (videoResult.success) {
          // 영상 저장 (projectId, videoId가 있고 영상 데이터가 있는 경우)
          if (projectId && videoId && videoResult.videoData) {
            const saved = await videoService.saveVideo(
              videoResult.videoData,
              videoResult.mimeType || 'video/mp4',
              projectId,
              videoId
            );
            generatedVideo = {
              ...saved,
              base64: videoResult.videoData,
              mimeType: videoResult.mimeType,
              duration: videoResult.duration,
              status: videoResult.status,
            };
          } else {
            generatedVideo = {
              base64: videoResult.videoData,
              mimeType: videoResult.mimeType,
              duration: videoResult.duration,
              status: videoResult.status,
              operationName: videoResult.operationName,
            };
          }
        } else {
          generatedVideo = {
            error: videoResult.error,
            status: videoResult.status,
            operationName: videoResult.operationName,
          };
        }
      } catch (videoError: any) {
        console.error('Video generation error:', videoError);
        generatedVideo = { error: videoError.message, status: 'FAILED' };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: chatResponse.response,
        videoPrompt: chatResponse.videoPrompt,
        style: chatResponse.style,
        attachedImageAnalysis: chatResponse.attachedImageAnalysis,
        readyToGenerate: chatResponse.readyToGenerate,
        suggestedDuration: chatResponse.suggestedDuration,
        video: generatedVideo,
        model: {
          chat: 'gemini-3-pro-preview',
          video: 'veo-3.1-generate-preview',
        },
      },
    });
  } catch (error: any) {
    console.error('Error in video chat:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/chat?operationName=xxx - 영상 생성 상태 확인
 * 비동기 영상 생성 작업의 상태를 확인
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationName = searchParams.get('operationName');

    if (!operationName) {
      return NextResponse.json(
        { success: false, error: 'operationName is required' },
        { status: 400 }
      );
    }

    const status = await videoService.checkVideoStatus(operationName);

    return NextResponse.json({
      success: status.success,
      data: {
        status: status.status,
        video: status.videoData ? {
          base64: status.videoData,
          mimeType: status.mimeType,
        } : null,
        error: status.error,
      },
    });
  } catch (error: any) {
    console.error('Error checking video status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
