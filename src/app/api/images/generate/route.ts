import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ImageGenerationService } from '@/services/imageGen';
import { db } from '@/lib/db';
import { ContentFormat } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface Scene {
  scene_id: number;
  description: string;
  characters: string[];
  setting: string;
  mood: string;
  camera_angle: string;
}

interface Character {
  role: string;
  age: number;
  gender: string;
  face_shape: string;
  skin_tone: string;
  hair: string;
  eyes: string;
  outfit: {
    top: string;
    bottom: string;
    shoes: string;
    accessories: string;
  };
  distinctive_features: string;
}

interface Style {
  name: string;
  en: string;
  prefix: string;
}

// PRD 스펙: 프롬프트 빌더
function buildScenePrompt(
  scene: Scene,
  characters: Record<string, Character>,
  style: Style
): string {
  const charDescriptions: string[] = [];

  for (const charName of scene.characters || []) {
    if (characters[charName]) {
      const char = characters[charName];
      const desc = `
[${charName}] - this exact character:
- ${char.age} year old ${char.gender}
- Face: ${char.face_shape}, ${char.skin_tone} skin
- Hair: ${char.hair}
- Eyes: ${char.eyes}
- Wearing: ${char.outfit?.top || 'casual top'}, ${char.outfit?.bottom || 'casual pants'}, ${char.outfit?.shoes || 'comfortable shoes'}
- Distinctive: ${char.distinctive_features || 'none'}`;
      charDescriptions.push(desc);
    }
  }

  const prompt = `
${style.prefix}

SCENE: ${scene.description}
SETTING: ${scene.setting || ''}
MOOD: ${scene.mood || ''}
CAMERA: ${scene.camera_angle || 'medium shot'}

CHARACTERS (maintain EXACT same appearance):
${charDescriptions.join('\n')}

STRICT RULES:
- Korean/East Asian characters only
- MODERN clothing only (absolutely NO traditional Korean hanbok)
- Maintain perfect character consistency
- High quality, detailed image
`;

  return prompt;
}

/**
 * POST /api/images/generate - 이미지 생성
 * PRD 스펙: gemini-2.5-flash-image 모델 사용 (현재 gemini-2.0-flash-exp 사용)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // PRD 기반 새 워크플로우 (scene, characters, style, aspectRatio)
    if (body.scene) {
      return handleSceneGeneration(body);
    }

    // 기존 워크플로우 (prompts, projectId, videoId)
    return handleLegacyGeneration(body);
  } catch (error: any) {
    console.error('Error generating images:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PRD 기반 새 워크플로우
async function handleSceneGeneration(body: {
  scene: Scene;
  characters: Record<string, Character>;
  style: Style;
  aspectRatio: string;
}) {
  const { scene, characters, style, aspectRatio } = body;

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      // @ts-ignore - Gemini API supports this
      responseModalities: ['image', 'text'],
    },
  });

  const prompt = buildScenePrompt(scene, characters || {}, style || {
    name: '실사',
    en: 'photorealistic',
    prefix: 'Photorealistic, ultra-detailed, professional photography style, ',
  });

  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `Generate an image with aspect ratio ${aspectRatio || '16:9'}: ${prompt}` }]
      }],
    });

    const response = await result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        return NextResponse.json({
          success: true,
          data: {
            image: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          },
        });
      }
    }

    return NextResponse.json(
      { success: false, error: '이미지가 생성되지 않았습니다.' },
      { status: 500 }
    );
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { success: false, error: 'Rate limit 초과. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }
    throw error;
  }
}

// 기존 워크플로우
async function handleLegacyGeneration(body: {
  prompts: string[];
  projectId: number;
  videoId: string;
  format?: string;
  quality?: string;
  style?: string;
  saveToDb?: boolean;
  dbScriptId?: number;
}) {
  const {
    prompts,
    projectId,
    videoId,
    format = 'long',
    saveToDb = false,
    dbScriptId,
  } = body;

  if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
    return NextResponse.json(
      { success: false, error: 'prompts array is required' },
      { status: 400 }
    );
  }

  if (!projectId || !videoId) {
    return NextResponse.json(
      { success: false, error: 'projectId and videoId are required' },
      { status: 400 }
    );
  }

  const imageService = new ImageGenerationService();

  console.log(`Generating ${prompts.length} images with Gemini (format: ${format})...`);

  const results = await imageService.generateImagesFromScript(
    '',
    prompts,
    projectId,
    videoId,
    format as ContentFormat
  );

  const successfulImages = results.filter(r => !r.error);
  const failedImages = results.filter(r => r.error);

  if (saveToDb && dbScriptId) {
    for (const img of successfulImages) {
      await db.generatedAssets.create({
        scriptId: dbScriptId,
        assetType: 'image',
        fileName: img.fileName,
        filePath: img.filePath,
        fileSizeBytes: img.fileSize,
        imagePrompt: img.prompt,
        imageResolution: format === 'short' ? '1080x1920' : '1920x1080',
        imageSequence: img.index,
        generationStatus: 'completed',
      });
    }

    for (const img of failedImages) {
      await db.generatedAssets.create({
        scriptId: dbScriptId,
        assetType: 'image',
        fileName: '',
        filePath: '',
        imagePrompt: img.prompt,
        imageSequence: img.index,
        generationStatus: 'failed',
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      format,
      model: 'gemini-2.0-flash-exp',
      totalRequested: prompts.length,
      successCount: successfulImages.length,
      failedCount: failedImages.length,
      images: results,
    },
  });
}
