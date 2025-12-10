import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { script, previousAnalysis, userMessage, conversationHistory = [] } = body;

    if (!userMessage || userMessage.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });

    // 대화 히스토리 포맷
    const historyText = conversationHistory
      .map((m: { role: string; content: string }) =>
        `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`
      )
      .join('\n');

    // 이전 분석 결과 요약
    const analysisContext = previousAnalysis
      ? `
## 이전 분석 결과 요약
- 대본 구성: ${previousAnalysis.structure?.sections?.map((s: any) => s.name).join(', ') || '없음'}
- 총 글자 수: ${previousAnalysis.characterCount?.total || '미분석'}
- 예상 영상 길이: ${previousAnalysis.characterCount?.estimatedDuration || '미분석'}
- 발견된 스토리텔링 기법: ${previousAnalysis.storytelling?.techniques?.filter((t: any) => t.detected).map((t: any) => t.name).join(', ') || '없음'}
- 발견된 훅 포인트: ${previousAnalysis.hooks?.found?.length || 0}개
- 개선 제안: ${previousAnalysis.improvements?.length || 0}개
`
      : '';

    const prompt = `당신은 YouTube 대본 분석 전문가이자 콘텐츠 기획 컨설턴트입니다.
사용자가 대본 분석 결과에 대해 추가 질문을 하고 있습니다.
대본과 분석 결과를 참고하여 도움이 되는 답변을 제공해주세요.

## 대본
${script || '(대본 없음)'}

${analysisContext}

## 이전 대화
${historyText || '(첫 대화)'}

## 사용자 질문
${userMessage}

---

위 질문에 대해 친절하고 전문적인 답변을 제공해주세요.
답변은 다음을 포함할 수 있습니다:
- 구체적인 수정 제안 (원본 → 수정본 형식)
- 추가 분석 내용
- 영상 기획에 도움이 되는 조언
- 구체적인 예시

답변은 마크다운 형식 없이 일반 텍스트로 작성해주세요.
한국어로 답변해주세요.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      response: text,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Script chat error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '응답 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
