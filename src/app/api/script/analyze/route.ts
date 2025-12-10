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
    const { script, analysisDepth = 'detailed' } = body;

    if (!script || script.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '대본 텍스트가 필요합니다.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'models/gemini-3-pro-preview' });

    const prompt = `당신은 YouTube/영상 콘텐츠 대본 분석 전문가입니다.
아래 대본을 분석하여 다음 항목들을 상세히 분석해주세요.

## 분석 항목

### 1. 대본 구성 분석
- 인트로/훅 (시작 부분) 구간과 내용
- 본론 (메인 콘텐츠) 섹션별 구분
- 아웃트로 (마무리) 구간
- 각 섹션의 시작/끝 글자 위치 표시

### 2. 각 섹션별 글자 수 분석
- 구간별 글자 수 계산
- 전체 대비 비율 (%)
- 이상적인 비율과의 비교 및 권장사항

### 3. 사용된 스토리텔링 기법 파악
- 문제-해결, 비포-애프터, 리스트형, 스토리형 등
- 각 기법의 효과성 평가 (높음/중간/낮음)
- 감지되지 않은 기법에 대한 제안

### 4. 후킹 포인트 추출
- 첫 3초/10초 훅 요소
- 중간 리텐션 유지 포인트
- 클릭/시청 유도 요소
- 각 훅의 강도 (강함/중간/약함)
- 누락된 훅 포인트

### 5. 개선 제안 (구체적으로)
- 구조적 개선점 (현재 문장 → 개선 문장)
- 표현 및 문장 수정 제안
- 추가하면 좋을 요소

### 6. 영상 기획 시 참고사항
- 타겟 오디언스 추정
- 콘텐츠 톤 분석
- 예상 영상 길이 (말하기 속도 기준)
- 컷 편집 권장 포인트
- 자막 강조 구간 제안
- B-roll 삽입 추천 구간
- 썸네일 아이디어

---

[대본]
${script}

---

반드시 아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이 JSON만):
{
  "structure": {
    "sections": [
      {
        "name": "섹션 이름 (예: 인트로, 본론1, 아웃트로)",
        "startChar": 시작 글자 위치 (숫자),
        "endChar": 끝 글자 위치 (숫자),
        "content": "해당 섹션의 핵심 내용 요약",
        "purpose": "섹션의 목적"
      }
    ]
  },
  "characterCount": {
    "total": 전체 글자 수,
    "bySection": [
      {
        "section": "섹션 이름",
        "count": 글자 수,
        "percentage": 비율 (숫자)
      }
    ],
    "estimatedDuration": "예상 영상 길이 (예: 3분 20초)",
    "recommendation": "비율 관련 권장사항"
  },
  "storytelling": {
    "techniques": [
      {
        "name": "기법 이름",
        "detected": true 또는 false,
        "examples": ["대본에서 발견된 예시"],
        "effectiveness": "높음/중간/낮음",
        "suggestion": "미감지 시 제안사항 (선택적)"
      }
    ]
  },
  "hooks": {
    "found": [
      {
        "type": "훅 유형 (오프닝 훅, 중간 훅, 클로징 훅)",
        "text": "훅 텍스트",
        "position": "위치 (예: 1~3번째 줄)",
        "strength": "강함/중간/약함",
        "technique": "사용된 기법 (예: 질문, 약속, 호기심 유발)"
      }
    ],
    "missing": ["누락된 훅 포인트 설명"]
  },
  "improvements": [
    {
      "category": "개선 카테고리",
      "current": "현재 문장 (선택적)",
      "improved": "개선된 문장 (선택적)",
      "issue": "문제점 (선택적)",
      "solution": "해결책 (선택적)",
      "reason": "개선 이유/기대 효과"
    }
  ],
  "planningNotes": {
    "targetAudience": "추정 타겟 오디언스",
    "contentTone": "콘텐츠 톤 (예: 정보 전달형, 친근함)",
    "visualRecommendations": ["비주얼 추천사항"],
    "editingNotes": ["편집 노트"],
    "thumbnailIdeas": ["썸네일 아이디어"]
  }
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        success: true,
        analysis,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: '분석 결과를 파싱할 수 없습니다.' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Script analysis error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
