import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ImageGenerationService } from '@/services/imageGen';
import { ContentFormat } from '@/types';
import fs from 'fs/promises';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const imageService = new ImageGenerationService();

/**
 * POST /api/images/chat - 이미지 생성 채팅 (이미지 첨부 지원)
 * Gemini Vision으로 이미지 분석, Gemini Image로 이미지 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      format = 'long',
      attachedImages = [], // base64 이미지 배열
      generateImage = false,
      projectId,
      videoId,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'messages array is required' },
        { status: 400 }
      );
    }

    // 마지막 사용자 메시지
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    if (!lastUserMessage) {
      return NextResponse.json(
        { success: false, error: 'No user message found' },
        { status: 400 }
      );
    }

    // Gemini Vision 모델 사용 (이미지 분석 가능)
    const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // 시스템 프롬프트
    const systemPrompt = `당신은 전문 이미지 생성 어시스턴트입니다.
사용자가 원하는 이미지를 설명하면, 다음을 수행하세요:

1. 사용자의 요청을 이해하고 구체적인 이미지 프롬프트를 작성하세요
2. 첨부된 이미지가 있다면 분석하여 참고하세요
3. 유튜브 콘텐츠에 적합한 고품질 이미지를 위한 프롬프트를 제안하세요

응답 형식 (JSON):
{
  "response": "사용자에게 보여줄 친절한 응답 메시지",
  "imagePrompt": "이미지 생성을 위한 상세한 영문 프롬프트 (photorealistic, high quality 스타일 포함)",
  "style": "vivid 또는 natural",
  "attachedImageAnalysis": "첨부 이미지 분석 결과 (첨부된 경우)",
  "readyToGenerate": true/false (이미지 생성 준비 완료 여부)
}

항상 JSON 형식으로만 응답하세요. imagePrompt는 영어로 작성하세요.`;

    // 메시지 구성
    const chatHistory = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

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
      parts.push({ text: '\n\n위 이미지를 참고하여 응답해주세요.' });
    }

    // Gemini Vision으로 응답 생성
    const result = await visionModel.generateContent({
      contents: [{ role: 'user', parts }],
    });

    const aiResponse = result.response.text();

    // JSON 파싱
    let parsedResponse;
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                       aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedResponse = JSON.parse(jsonStr);
    } catch {
      parsedResponse = {
        response: aiResponse,
        imagePrompt: null,
        readyToGenerate: false,
      };
    }

    // 이미지 생성 요청이 있고, 프롬프트가 준비된 경우
    let generatedImage = null;
    if (generateImage && parsedResponse.imagePrompt && parsedResponse.readyToGenerate) {
      try {
        const imageResult = await imageService.generateImage(
          parsedResponse.imagePrompt,
          format as ContentFormat,
          {
            quality: 'hd',
            style: parsedResponse.style === 'vivid' ? 'vivid' : 'natural',
          }
        );

        // 이미지 저장 (projectId, videoId가 있는 경우)
        if (projectId && videoId && imageResult.base64) {
          const timestamp = Date.now();
          const saved = await imageService.saveBase64Image(
            imageResult.base64,
            imageResult.mimeType,
            projectId,
            videoId,
            timestamp,
            format as ContentFormat
          );
          generatedImage = {
            ...saved,
            base64: imageResult.base64,
            mimeType: imageResult.mimeType,
            revisedPrompt: imageResult.revisedPrompt,
          };
        } else {
          generatedImage = {
            base64: imageResult.base64,
            mimeType: imageResult.mimeType,
            revisedPrompt: imageResult.revisedPrompt,
          };
        }
      } catch (imageError: any) {
        console.error('Image generation error:', imageError);
        parsedResponse.imageError = imageError.message;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: parsedResponse.response,
        imagePrompt: parsedResponse.imagePrompt,
        style: parsedResponse.style,
        attachedImageAnalysis: parsedResponse.attachedImageAnalysis,
        readyToGenerate: parsedResponse.readyToGenerate,
        image: generatedImage,
        model: {
          chat: 'gemini-2.0-flash',
          image: 'gemini-3-pro-preview',
        },
      },
    });
  } catch (error: any) {
    console.error('Error in image chat:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
