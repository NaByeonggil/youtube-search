import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';
import { ContentFormat, ScriptOutlineResult, ContentIdeaItem } from '@/types';

const geminiService = new GeminiService();

/**
 * POST /api/scripts/generate-from-outline - 목차 기반 대본 생성
 * 대본 목차(아웃라인)를 바탕으로 완성된 대본을 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outline, contentIdea, format = 'long' } = body;

    if (!outline || !outline.sections) {
      return NextResponse.json(
        { success: false, error: 'outline with sections is required' },
        { status: 400 }
      );
    }

    console.log(`Generating script from outline: ${outline.title}`);

    // 목차를 바탕으로 상세 대본 생성
    const script = await generateScriptFromOutline(
      outline as ScriptOutlineResult,
      contentIdea as ContentIdeaItem,
      format as ContentFormat
    );

    return NextResponse.json({
      success: true,
      data: script,
    });
  } catch (error: any) {
    console.error('Error generating script from outline:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function generateScriptFromOutline(
  outline: ScriptOutlineResult,
  contentIdea: ContentIdeaItem,
  format: ContentFormat
) {
  const isShort = format === 'short';

  // 섹션별 상세 내용 구성
  const sectionsDetail = outline.sections
    .map(s => `## 섹션 ${s.order}: ${s.title} (${s.duration})
핵심 포인트: ${s.keyPoints.join(', ')}
힌트: ${s.scriptHint}`)
    .join('\n\n');

  const prompt = `당신은 YouTube 콘텐츠 크리에이터를 위한 전문 대본 작가입니다.
주어진 목차를 바탕으로 완성도 높은 YouTube 대본을 작성해주세요.

## 영상 정보
- 제목: ${outline.title}
- 형식: ${isShort ? '숏폼 (60초)' : '롱폼 (5-15분)'}
- 예상 길이: ${outline.estimatedDuration}
- 타겟 청중: ${contentIdea?.targetAudience || '일반 시청자'}

## 훅 (첫 문장)
${outline.hook}

## 대본 구조
${sectionsDetail}

## CTA (행동 유도)
${outline.callToAction}

## 작성 지침
1. 각 섹션의 핵심 포인트를 자연스럽게 풀어서 작성
2. 시청자와 대화하듯 친근한 톤 사용
3. 훅은 강렬하게, 본론은 명확하게, 결론은 인상적으로
4. ${isShort ? '숏폼이므로 간결하고 빠른 전달' : '롱폼이므로 상세하고 풍부한 설명'}
5. 화면 연출 노트 포함

반드시 아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이 JSON만):
{
  "fullScript": "전체 대본 텍스트 (마크다운 형식, 섹션별 구분 포함)",
  "hook": "훅/오프닝 부분",
  "intro": "도입부 (숏폼은 빈 문자열)",
  "body": "본론 부분",
  "conclusion": "결론/클로저 부분",
  "estimatedDuration": ${isShort ? 60 : 300},
  "scenes": [
    {
      "sceneNumber": 1,
      "timeRange": "0:00~0:05",
      "description": "장면 설명",
      "script": "대사/나레이션",
      "visualNote": "화면 연출 노트"
    }
  ]
}`;

  const genAI = geminiService['genAI'];
  const model = genAI.getGenerativeModel({ model: 'models/gemini-3-pro-preview' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error parsing script response:', error);
  }

  // 파싱 실패 시 기본값 반환
  return {
    fullScript: text,
    hook: outline.hook,
    intro: '',
    body: '',
    conclusion: '',
    estimatedDuration: isShort ? 60 : 300,
    scenes: [],
  };
}
