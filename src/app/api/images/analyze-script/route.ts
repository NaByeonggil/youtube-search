import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// PRD 스펙: 캐릭터 제약 조건
const CHARACTER_CONSTRAINTS = `
CRITICAL RULES FOR ALL CHARACTERS:
- All characters must be Korean/East Asian ethnicity
- Characters must wear MODERN clothing (casual, business, etc.)
- NEVER use traditional Korean clothing (hanbok) - this is STRICTLY PROHIBITED
- Clothing examples: t-shirts, jeans, hoodies, suits, dresses, skirts
`;

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const { script, maxScenes = 100, style } = await request.json();

    if (!script || typeof script !== 'string') {
      return NextResponse.json(
        { success: false, error: '대본이 필요합니다.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

    const prompt = `
You are a professional script analyzer for image generation.

Analyze the following Korean script and extract:

1. CHARACTERS: Create detailed profiles for ALL characters (main and supporting)
   - Name
   - Role (main/supporting)
   - Age (specific number)
   - Gender
   - Physical appearance:
     * Face shape, skin tone
     * Hair (color, length, style)
     * Eye color/shape
   - Outfit (MODERN clothing only - NO hanbok):
     * Top, Bottom, Shoes
     * Accessories
   - Distinctive features (mole, scar, etc.)

2. SCENES: Divide into ${maxScenes} or fewer visual scenes
   For each scene:
   - scene_id: Sequential number (1, 2, 3...)
   - description: What's happening (visual description)
   - characters: List of character names in this scene
   - setting: Location/environment
   - mood: Emotional tone
   - camera_angle: Suggested shot type (close-up, wide, etc.)

${CHARACTER_CONSTRAINTS}

SCRIPT:
${script.slice(0, 10000)}

OUTPUT FORMAT (JSON only, no markdown):
{
  "characters": {
    "character_name": {
      "role": "main/supporting",
      "age": 28,
      "gender": "male/female",
      "face_shape": "oval",
      "skin_tone": "fair",
      "hair": "black, short, neat",
      "eyes": "dark brown, almond-shaped",
      "outfit": {
        "top": "white button-up shirt",
        "bottom": "navy slacks",
        "shoes": "brown leather shoes",
        "accessories": "silver watch"
      },
      "distinctive_features": "small mole near left eye"
    }
  },
  "scenes": [
    {
      "scene_id": 1,
      "description": "...",
      "characters": ["character_name"],
      "setting": "...",
      "mood": "...",
      "camera_angle": "..."
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // JSON 블록 추출
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }

    // JSON 파싱
    const analysis = JSON.parse(text.trim());

    return NextResponse.json({
      success: true,
      data: {
        characters: analysis.characters || {},
        scenes: analysis.scenes || [],
      },
    });
  } catch (error: any) {
    console.error('Script analysis error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '대본 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
