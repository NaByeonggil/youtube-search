# YouTube 콘텐츠 분석 및 자동화 워크플로우 PRD

## 문서 정보
- **버전**: v6.0
- **작성일**: 2024-12-15
- **최종 수정**: 댓글분석-대본생성 채팅 연결, 캐릭터(5명) 이미지 생성 워크플로우 추가
- **목적**: YouTube 콘텐츠 분석, 자동 대본 생성, 영상 제작 및 업로드 자동화 시스템

---

## 전체 프로세스 개요

이 시스템은 크게 18개의 주요 단계로 구성됩니다. 사용자는 최초 설정에서 **숏폼/롱폼**을 선택할 수 있으며, 각 단계별 분석 결과와 생성된 에셋을 **마크다운 파일로 다운로드**할 수 있습니다. 모든 데이터는 **MariaDB**에 저장되고 **Google Sheets**에 실시간 동기화됩니다. **다중 플랫폼 업로드**, **A/B 테스트**, **성과 대시보드**, **템플릿 시스템**, **협업 워크플로우**, **백업 자동화**, **알림 시스템**을 지원합니다.

### 기본 AI 모델 설정

| 용도 | 기본 모델 | 프로바이더 |
|------|-----------|------------|
| 댓글 분석 / 대본 생성 | **models/gemini-3-pro-preview** | Google AI |
| 이미지 생성 | **models/gemini-3-pro-image-preview** | Google AI |
| 음성 합성 (TTS) | ElevenLabs | ElevenLabs |
| 음성 인식 (STT) | Whisper | OpenAI |

---

## 0단계: 콘텐츠 포맷 선택

**기본값**: 롱폼

| 구분 | 숏폼 (Shorts/Reels) | 롱폼 (일반 영상) |
|------|---------------------|------------------|
| 화면 비율 | 9:16 (세로) | 16:9 (가로) |
| 해상도 | 1080×1920 | 1920×1080 |
| 권장 길이 | 30초~60초 | 5분~15분 |
| 대본 분량 | 150~300자 | 1,500~3,000자 |
| 이미지 수 | 2~4컷 | 4~8컷 |
| 자막 스타일 | 대형, 중앙 배치, 짧은 문장 | 하단 고정, 긴 문장 가능 |
| 음성 속도 | 빠름 (1.1~1.2배) | 보통 (1.0배) |
| 편집 스타일 | 빠른 컷, 강한 훅 | 자연스러운 전환 |

**UI 구현 방식**: 토글 스위치 또는 라디오 버튼으로 구현합니다. 선택 시 하단에 해당 포맷의 특성 요약이 표시되면 사용자 이해에 도움이 됩니다. 이 설정값은 이후 모든 단계에 전파되어 대본 길이, 이미지 생성 비율, 영상 인코딩 설정 등에 영향을 줍니다.

---

## 1단계: YouTube 키워드 검색 및 데이터 수집

**사용 API**: YouTube Data API v3

검색 시 **포맷에 따른 필터링**을 적용합니다. 숏폼 선택 시에는 videoDuration=short 파라미터로 4분 이하 영상만 검색하고, 롱폼 선택 시에는 videoDuration=medium 또는 long으로 4분 이상 영상을 검색합니다.

**수집할 데이터**: 영상 ID, 제목, 조회수, 좋아요수, 댓글수, 채널 ID, 채널 구독자수, 업로드 날짜, 영상 길이

---

## 2단계: 조회수 터짐 지수 계산 및 5단계 분류

**계산 공식**: 터짐 지수 = (조회수 / 구독자수) × 시간 가중치

시간 가중치는 업로드 후 경과 일수를 반영합니다. 숏폼은 바이럴 속도가 빠르므로 가중치 감쇠를 더 급격하게 적용합니다. 예를 들어 숏폼은 3일 이내 1.5배, 7일 이내 1.2배로, 롱폼은 7일 이내 1.5배, 30일 이내 1.2배로 설정합니다.

**5단계 분류 기준**:

| 등급 | 명칭 | 터짐 지수 범위 |
|------|------|----------------|
| S | 폭발 | 10 이상 |
| A | 대성공 | 5 ~ 10 |
| B | 성공 | 2 ~ 5 |
| C | 평균 | 0.5 ~ 2 |
| D | 저조 | 0.5 미만 |

숏폼의 경우 전반적으로 터짐 지수가 높게 나오는 경향이 있으므로, 포맷별로 기준을 분리하거나 상대적 백분위로 등급을 매기는 것이 더 정확합니다.

---

## 3단계: 토글 가능한 테이블 UI 구현

**기술 스택**: React + Tailwind CSS

테이블 상단에 포맷 선택 토글을 배치하고, 등급별로 그룹핑된 아코디언 리스트를 표시합니다. 각 행에는 썸네일, 제목, 채널명, 조회수, 구독자수, 터짐 지수, 영상 길이, 그리고 상세 분석 버튼을 배치합니다.

포맷 변경 시 검색 결과가 새로고침되며, 현재 선택된 포맷이 시각적으로 강조되어야 합니다.

---

## 4단계: 댓글 수집 및 AI 감성 분석

**댓글 수집**: YouTube Data API의 commentThreads 엔드포인트를 사용합니다. 숏폼은 댓글이 적은 경향이 있으므로 50~100개, 롱폼은 100~200개 정도를 수집합니다.

### AI 모델 선택

| 용도 | 기본 모델 | 대체 모델 |
|------|-----------|-----------|
| 댓글 분석 | **models/gemini-3-pro-preview** | Claude Sonnet 4, GPT-4o |
| 이미지 생성 | **models/gemini-3-pro-image-preview** | Midjourney, DALL-E 3, Flux |

### 분석 모델 설정

```javascript
const AI_MODELS = {
  // 댓글 분석 및 대본 생성용
  textAnalysis: {
    default: 'models/gemini-3-pro-preview',
    alternatives: ['claude-sonnet-4-20250514', 'gpt-4o']
  },
  // 이미지 생성용
  imageGeneration: {
    default: 'models/gemini-3-pro-image-preview',
    alternatives: ['midjourney-v6', 'dall-e-3', 'flux-pro']
  }
};
```

### Gemini API 댓글 분석 구현

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeComments(comments, modelId = 'models/gemini-3-pro-preview') {
  const model = genAI.getGenerativeModel({ model: modelId });
  
  const prompt = `
다음 YouTube 댓글들을 분석해주세요.

## 분석 요청사항:
1. 긍정/부정으로 분류
2. 각 그룹별 주요 의견 요약 (3줄 이내)
3. 핵심 키워드 추출
4. 개선 제안 도출

## 댓글 목록:
${comments.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 출력 형식 (JSON):
{
  "positive": {
    "count": 숫자,
    "percentage": 숫자,
    "summary": "요약 텍스트",
    "keywords": ["키워드1", "키워드2"]
  },
  "negative": {
    "count": 숫자,
    "percentage": 숫자,
    "summary": "요약 텍스트",
    "keywords": ["키워드1", "키워드2"],
    "improvements": ["개선점1", "개선점2"]
  }
}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // JSON 파싱
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return { raw: text };
}
```

### Gemini 이미지 생성 구현

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateImage(prompt, options = {}) {
  const model = genAI.getGenerativeModel({ 
    model: options.modelId || 'models/gemini-3-pro-image-preview'
  });
  
  const aspectRatio = options.format === 'short' ? '9:16' : '16:9';
  
  const enhancedPrompt = `
${prompt}

Style: Photorealistic, high resolution, 8K quality
Aspect Ratio: ${aspectRatio}
Lighting: Professional studio lighting
`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
    generationConfig: {
      responseModalities: ['image', 'text'],
      responseMimeType: 'image/png'
    }
  });

  const response = await result.response;
  
  // 이미지 데이터 추출
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return {
        mimeType: part.inlineData.mimeType,
        data: part.inlineData.data // base64 인코딩된 이미지
      };
    }
  }
  
  throw new Error('이미지 생성 실패');
}

// 여러 이미지 일괄 생성
async function generateSceneImages(script, format = 'long') {
  const scenes = extractScenes(script);
  const images = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const image = await generateImage(scenes[i].imagePrompt, { format });
    images.push({
      sequence: i + 1,
      scene: scenes[i].name,
      ...image
    });
  }
  
  return images;
}
```

### 모델 설정 테이블 (ai_model_configs)

```sql
CREATE TABLE ai_model_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL,
    model_type ENUM('text_analysis', 'image_generation', 'tts', 'stt') NOT NULL,
    provider ENUM('google', 'anthropic', 'openai', 'elevenlabs', 'midjourney') NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- API 설정
    api_endpoint VARCHAR(300),
    max_tokens INT,
    temperature DECIMAL(2,1) DEFAULT 0.7,
    
    -- 비용 정보
    cost_per_1k_input DECIMAL(10,6),
    cost_per_1k_output DECIMAL(10,6),
    cost_per_image DECIMAL(10,4),
    
    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_type_default (model_type, is_default),
    INDEX idx_model_type (model_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 모델 설정
INSERT INTO ai_model_configs (config_name, model_type, provider, model_id, is_default, cost_per_1k_input, cost_per_1k_output) VALUES
('Gemini 3 Pro (댓글분석)', 'text_analysis', 'google', 'models/gemini-3-pro-preview', TRUE, 0.00125, 0.005),
('Claude Sonnet 4', 'text_analysis', 'anthropic', 'claude-sonnet-4-20250514', FALSE, 0.003, 0.015),
('GPT-4o', 'text_analysis', 'openai', 'gpt-4o', FALSE, 0.005, 0.015);

INSERT INTO ai_model_configs (config_name, model_type, provider, model_id, is_default, cost_per_image) VALUES
('Gemini 3 Pro Image (이미지생성)', 'image_generation', 'google', 'models/gemini-3-pro-image-preview', TRUE, 0.04),
('DALL-E 3', 'image_generation', 'openai', 'dall-e-3', FALSE, 0.04),
('Midjourney v6', 'image_generation', 'midjourney', 'midjourney-v6', FALSE, 0.05);
```

### 통합 AI 서비스

```javascript
class AIService {
  constructor(db) {
    this.db = db;
    this.providers = {
      google: new GoogleGenerativeAI(process.env.GEMINI_API_KEY),
      anthropic: new Anthropic({ apiKey: process.env.CLAUDE_API_KEY }),
      openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    };
  }

  // 기본 모델 조회
  async getDefaultModel(modelType) {
    const [models] = await this.db.execute(
      `SELECT * FROM ai_model_configs WHERE model_type = ? AND is_default = TRUE AND is_active = TRUE`,
      [modelType]
    );
    return models[0];
  }

  // 댓글 분석 (모델 선택 가능)
  async analyzeComments(comments, modelId = null) {
    const config = modelId 
      ? await this.getModelById(modelId)
      : await this.getDefaultModel('text_analysis');
    
    switch (config.provider) {
      case 'google':
        return await this.analyzeWithGemini(comments, config.model_id);
      case 'anthropic':
        return await this.analyzeWithClaude(comments, config.model_id);
      case 'openai':
        return await this.analyzeWithGPT(comments, config.model_id);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  // 이미지 생성 (모델 선택 가능)
  async generateImage(prompt, options = {}) {
    const config = options.modelId 
      ? await this.getModelById(options.modelId)
      : await this.getDefaultModel('image_generation');
    
    switch (config.provider) {
      case 'google':
        return await this.generateWithImagen(prompt, config.model_id, options);
      case 'openai':
        return await this.generateWithDallE(prompt, options);
      case 'midjourney':
        return await this.generateWithMidjourney(prompt, options);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  // Gemini 분석
  async analyzeWithGemini(comments, modelId) {
    const model = this.providers.google.getGenerativeModel({ model: modelId });
    // ... 구현
  }

  // Imagen 이미지 생성
  async generateWithImagen(prompt, modelId, options) {
    const model = this.providers.google.getGenerativeModel({ model: modelId });
    // ... 구현
  }
}
```

### 환경 변수 설정

```bash
# .env 파일
# Google AI (Gemini & Imagen)
GEMINI_API_KEY=AIzaSy-xxxxxxxxxxxx

# Anthropic (Claude) - 대체 모델용
CLAUDE_API_KEY=sk-ant-api03-xxxxxxxxxxxx

# OpenAI (GPT & DALL-E) - 대체 모델용
OPENAI_API_KEY=sk-xxxxxxxxxxxx
```

### Google AI API 발급 방법

1. **Google AI Studio 접속**: https://aistudio.google.com
2. **API Key 생성**: 좌측 메뉴 "Get API Key" 클릭
3. **프로젝트 선택** 또는 새 프로젝트 생성
4. **API Key 복사** 후 환경변수에 저장

**AI 분석**: 수집된 댓글을 긍정/부정으로 분류하고 요약합니다. 기본적으로 **Gemini 3 Pro**를 사용하며, 필요시 Claude나 GPT로 전환 가능합니다.

**출력 형식**: 긍정 댓글 요약(주요 칭찬 포인트), 부정 댓글 요약(불만 사항 및 개선 요구)으로 구성합니다.

### 댓글 분석 → 대본 생성 연결 UI

댓글 분석 결과를 대본 생성에 활용할 수 있도록 **채팅형 입력 인터페이스**를 제공합니다.

#### UI 구성

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 댓글 분석 결과                                    [복사] [적용] │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 긍정 요약: 설명이 쉽고 실천하기 좋다는 평가                      │
│  ❌ 부정 요약: 영상이 너무 길다, 자막이 작다                         │
│  🔑 키워드: 다이어트, 초보, 식단, 운동                              │
│  💡 개선제안: 핵심만 짧게, 자막 크기 확대                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓ [대본 생성에 적용]
┌─────────────────────────────────────────────────────────────────┐
│  💬 대본 생성 채팅                                                │
├─────────────────────────────────────────────────────────────────┤
│  🤖 AI: 댓글 분석 결과를 확인했습니다.                              │
│      - 긍정: 쉬운 설명, 실천 가능한 팁                             │
│      - 부정: 영상 길이, 자막 가독성                                │
│      어떤 스타일의 대본을 원하시나요?                               │
│                                                                  │
│  👤 사용자: 숏폼으로 핵심만 60초 안에 전달해줘.                      │
│            주인공은 30대 여성 직장인으로 설정해줘.                   │
│                                                                  │
│  🤖 AI: 네, 30대 여성 직장인 주인공으로 60초 숏폼 대본을             │
│      작성하겠습니다. 등장인물을 추가로 설정할까요?                    │
│                                                                  │
│  👤 사용자: 응, 영양사 선생님이랑 운동 트레이너도 나오게 해줘         │
├─────────────────────────────────────────────────────────────────┤
│  [입력창: 대본 방향, 캐릭터 설정, 추가 요청사항 입력...]    [전송 ▶] │
└─────────────────────────────────────────────────────────────────┘
```

#### 채팅 입력 데이터 구조

```typescript
interface ScriptChatInput {
  // 댓글 분석 결과 (자동 연결)
  commentAnalysis: {
    positiveSummary: string;
    negativeSummary: string;
    keywords: string[];
    improvements: string[];
  };
  
  // 사용자 입력 (채팅)
  userMessages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
  
  // 캐릭터 설정
  characters: {
    role: 'protagonist' | 'supporting';  // 주인공/조연
    name: string;
    description: string;
    appearance: string;  // 외모 묘사 (이미지 생성용)
    personality: string;
    voiceStyle: string;  // TTS 스타일
  }[];
  
  // 대본 설정
  scriptSettings: {
    format: 'short' | 'long';
    duration: number;  // 초
    tone: string;      // 유머, 진지, 감성 등
    targetAudience: string;
  };
}
```

#### 채팅 기반 대본 생성 서비스

```javascript
class ScriptChatService {
  constructor(db, geminiService) {
    this.db = db;
    this.ai = geminiService;
  }

  // 채팅 세션 시작 (댓글 분석 결과 연결)
  async startSession(videoId, commentAnalysisId) {
    const analysis = await this.getCommentAnalysis(commentAnalysisId);
    
    const systemPrompt = `
당신은 YouTube 콘텐츠 대본 작가입니다.
다음 댓글 분석 결과를 바탕으로 대본을 작성해야 합니다:

[댓글 분석 결과]
- 긍정 요약: ${analysis.positiveSummary}
- 부정 요약: ${analysis.negativeSummary}  
- 핵심 키워드: ${analysis.keywords.join(', ')}
- 개선 제안: ${analysis.improvements.join(', ')}

사용자와 대화하며 다음 정보를 수집하세요:
1. 콘텐츠 포맷 (숏폼/롱폼)
2. 주인공 및 등장인물 설정
3. 대본 톤앤매너
4. 특별 요청사항

충분한 정보가 모이면 대본 초안을 제시하세요.
`;

    const sessionId = await this.createSession(videoId, systemPrompt, analysis);
    
    // 첫 메시지 생성
    const firstMessage = await this.ai.generateResponse(systemPrompt, []);
    await this.saveMessage(sessionId, 'assistant', firstMessage);
    
    return { sessionId, firstMessage, analysis };
  }

  // 사용자 메시지 처리
  async sendMessage(sessionId, userMessage) {
    const session = await this.getSession(sessionId);
    
    // 사용자 메시지 저장
    await this.saveMessage(sessionId, 'user', userMessage);
    
    // 캐릭터 정보 추출 시도
    const characterInfo = await this.extractCharacterInfo(userMessage);
    if (characterInfo) {
      await this.updateCharacters(sessionId, characterInfo);
    }
    
    // AI 응답 생성
    const history = await this.getMessageHistory(sessionId);
    const response = await this.ai.generateResponse(session.systemPrompt, history);
    
    await this.saveMessage(sessionId, 'assistant', response);
    
    // 대본 생성 준비 완료 여부 체크
    const readyToGenerate = await this.checkReadyToGenerate(sessionId);
    
    return { 
      response, 
      readyToGenerate,
      characters: await this.getCharacters(sessionId)
    };
  }

  // 캐릭터 정보 추출
  async extractCharacterInfo(message) {
    const prompt = `
다음 메시지에서 캐릭터/등장인물 정보를 추출하세요.
없으면 null을 반환하세요.

메시지: "${message}"

JSON 형식으로 반환:
{
  "characters": [
    {
      "role": "protagonist" 또는 "supporting",
      "name": "이름 또는 역할명",
      "description": "설명",
      "appearance": "외모 묘사",
      "gender": "male/female",
      "age": "나이대"
    }
  ]
}
`;
    
    const result = await this.ai.generateJSON(prompt);
    return result?.characters?.length > 0 ? result.characters : null;
  }

  // 대본 생성 실행
  async generateScript(sessionId) {
    const session = await this.getSession(sessionId);
    const characters = await this.getCharacters(sessionId);
    const history = await this.getMessageHistory(sessionId);
    
    const scriptPrompt = `
지금까지의 대화 내용을 바탕으로 완성된 대본을 작성하세요.

[등장인물]
${characters.map(c => `- ${c.name} (${c.role}): ${c.description}`).join('\n')}

[대본 형식]
- 포맷: ${session.settings.format === 'short' ? '숏폼 (60초)' : '롱폼 (5-10분)'}
- 톤: ${session.settings.tone || '자연스럽고 친근한'}

각 장면(Scene)별로 다음 정보를 포함하세요:
1. 장면 번호 및 제목
2. 등장인물
3. 대사 및 나레이션
4. 화면 설명 (이미지 생성용)
5. 예상 시간

JSON 형식으로 출력하세요.
`;

    const scriptData = await this.ai.generateJSON(scriptPrompt);
    
    // DB 저장
    const scriptId = await this.saveScript(session.videoId, scriptData, characters);
    
    return { scriptId, script: scriptData, characters };
  }
}
```

#### 채팅 입력 React 컴포넌트

```jsx
// components/script/ScriptChatInput.jsx
import { useState, useRef, useEffect } from 'react';

export function ScriptChatInput({ 
  commentAnalysis, 
  videoId,
  onScriptGenerated 
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const chatEndRef = useRef(null);

  // 세션 시작
  useEffect(() => {
    async function initSession() {
      const res = await fetch('/api/script-chat/start', {
        method: 'POST',
        body: JSON.stringify({ videoId, commentAnalysisId: commentAnalysis.id })
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages([{ role: 'assistant', content: data.firstMessage }]);
    }
    initSession();
  }, [videoId, commentAnalysis]);

  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/script-chat/message', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message: userMessage })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      setCharacters(data.characters || []);
      setReadyToGenerate(data.readyToGenerate);
    } finally {
      setIsLoading(false);
    }
  };

  // 대본 생성
  const generateScript = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/script-chat/generate', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      onScriptGenerated(data);
    } finally {
      setIsLoading(false);
    }
  };

  // 댓글 분석 결과 복사
  const copyAnalysis = () => {
    const text = `
긍정 요약: ${commentAnalysis.positiveSummary}
부정 요약: ${commentAnalysis.negativeSummary}
키워드: ${commentAnalysis.keywords.join(', ')}
개선제안: ${commentAnalysis.improvements.join(', ')}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 댓글 분석 결과 카드 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">📊 댓글 분석 결과</h3>
          <div className="space-x-2">
            <button onClick={copyAnalysis} className="text-sm text-blue-600">
              복사
            </button>
          </div>
        </div>
        <div className="text-sm space-y-1">
          <p>✅ 긍정: {commentAnalysis.positiveSummary}</p>
          <p>❌ 부정: {commentAnalysis.negativeSummary}</p>
          <p>🔑 키워드: {commentAnalysis.keywords.join(', ')}</p>
        </div>
      </div>

      {/* 캐릭터 목록 */}
      {characters.length > 0 && (
        <div className="bg-blue-50 p-3 rounded-lg mb-4">
          <h4 className="font-medium mb-2">🎭 등장인물 ({characters.length}명)</h4>
          <div className="flex flex-wrap gap-2">
            {characters.map((char, i) => (
              <span key={i} className="px-2 py-1 bg-white rounded text-sm">
                {char.role === 'protagonist' ? '⭐' : '👤'} {char.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 채팅 메시지 영역 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              msg.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex">
            <div className="bg-gray-100 p-3 rounded-lg">
              <span className="animate-pulse">생각 중...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="대본 방향, 캐릭터 설정, 추가 요청사항 입력..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={isLoading}
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            전송
          </button>
        </div>
        
        {readyToGenerate && (
          <button
            onClick={generateScript}
            disabled={isLoading}
            className="w-full mt-3 px-4 py-3 bg-green-500 text-white rounded-lg font-medium"
          >
            🎬 대본 생성하기
          </button>
        )}
      </div>
    </div>
  );
}
```

### 채팅 세션 테이블 (script_chat_sessions)

```sql
CREATE TABLE script_chat_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id BIGINT NOT NULL,
    comment_analysis_id BIGINT,
    
    -- 시스템 프롬프트
    system_prompt TEXT,
    
    -- 설정
    settings JSON,  -- format, tone, duration 등
    
    -- 상태
    status ENUM('chatting', 'ready', 'generated', 'cancelled') DEFAULT 'chatting',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES selected_videos(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_analysis_id) REFERENCES comment_analysis(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 채팅 메시지 테이블 (script_chat_messages)

```sql
CREATE TABLE script_chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    
    -- 추출된 정보
    extracted_data JSON,  -- 캐릭터 정보 등
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES script_chat_sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


---

## 5단계: 캐릭터 설정 및 대본 생성

4단계 채팅에서 수집된 캐릭터 정보를 바탕으로 대본을 생성합니다.

### 캐릭터 테이블 (script_characters)

```sql
CREATE TABLE script_characters (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    script_id BIGINT,
    
    -- 기본 정보
    role ENUM('protagonist', 'supporting', 'narrator') NOT NULL,
    character_name VARCHAR(100) NOT NULL,
    character_type VARCHAR(50),  -- 영양사, 트레이너, 직장인 등
    
    -- 외모 설정 (이미지 생성용)
    gender ENUM('male', 'female', 'neutral') DEFAULT 'neutral',
    age_range VARCHAR(20),  -- 20대 후반, 30대 초반 등
    appearance_description TEXT,  -- 상세 외모 묘사
    clothing_style TEXT,  -- 의상 스타일
    
    -- 성격 및 말투
    personality TEXT,
    speaking_style TEXT,
    voice_style VARCHAR(50),  -- TTS 음성 스타일
    
    -- 이미지 생성 프롬프트 (자동 생성)
    image_prompt TEXT,
    
    -- 생성된 이미지
    generated_image_path VARCHAR(500),
    generated_image_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES script_chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (script_id) REFERENCES generated_scripts(id) ON DELETE SET NULL,
    INDEX idx_session (session_id),
    INDEX idx_script (script_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 캐릭터 설정 UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🎭 등장인물 설정 (5명)                              [+ 추가]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⭐ 주인공: 김지영                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 역할: 30대 여성 직장인                                    │   │
│  │ 외모: 단발머리, 깔끔한 오피스룩, 친근한 미소               │   │
│  │ 성격: 밝고 긍정적, 다이어트 도전 중                        │   │
│  │ 말투: 친근하고 공감가는 톤                                 │   │
│  │ [이미지 생성] [수정] [삭제]                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  👤 조연 1: 박영양 (영양사)                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 역할: 전문 영양사                                         │   │
│  │ 외모: 40대 여성, 흰 가운, 전문적인 이미지                  │   │
│  │ 성격: 전문적이면서 따뜻한                                  │   │
│  │ [이미지 생성] [수정] [삭제]                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  👤 조연 2: 이트레이너 (피트니스 트레이너)                       │
│  👤 조연 3: 최동료 (직장 동료)                                   │
│  👤 조연 4: 정멘토 (다이어트 성공자)                             │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [전체 이미지 일괄 생성]                    [대본 생성으로 이동 →] │
└─────────────────────────────────────────────────────────────────┘
```

### 캐릭터 이미지 프롬프트 자동 생성

```javascript
class CharacterImageService {
  constructor(geminiImageService) {
    this.imageService = geminiImageService;
  }

  // 캐릭터 정보 → 이미지 프롬프트 변환
  generateImagePrompt(character, format = 'long') {
    const aspectRatio = format === 'short' ? '9:16' : '16:9';
    
    const basePrompt = `
Professional portrait of a Korean ${character.gender === 'female' ? 'woman' : 'man'},
${character.age_range || '30s'},
${character.appearance_description || 'clean and professional appearance'},
wearing ${character.clothing_style || 'casual business attire'},
${character.character_type ? `role: ${character.character_type}` : ''},
natural expression, studio lighting,
high resolution, photorealistic, 8K quality,
aspect ratio ${aspectRatio}
    `.trim().replace(/\n/g, ' ');

    return basePrompt;
  }

  // 단일 캐릭터 이미지 생성
  async generateCharacterImage(character, format = 'long') {
    const prompt = this.generateImagePrompt(character, format);
    
    const result = await this.imageService.generateImage(prompt, {
      format,
      style: 'photorealistic'
    });
    
    return {
      characterId: character.id,
      prompt,
      ...result
    };
  }

  // 전체 캐릭터 일괄 이미지 생성
  async generateAllCharacterImages(sessionId, format = 'long') {
    const characters = await this.getCharactersBySession(sessionId);
    const results = [];
    
    for (const character of characters) {
      console.log(`캐릭터 이미지 생성 중: ${character.character_name}`);
      
      try {
        const image = await this.generateCharacterImage(character, format);
        
        // 파일 저장
        const fileName = `character_${character.id}_${character.character_name}.png`;
        const filePath = await this.saveImage(image.data, sessionId, fileName);
        
        // DB 업데이트
        await this.updateCharacterImage(character.id, filePath, image.prompt);
        
        results.push({
          characterId: character.id,
          name: character.character_name,
          success: true,
          filePath
        });
      } catch (error) {
        results.push({
          characterId: character.id,
          name: character.character_name,
          success: false,
          error: error.message
        });
      }
      
      // API 레이트 리밋 방지
      await this.delay(2000);
    }
    
    return results;
  }
}
```

### 콘텐츠 요약 (기존 기능)

**콘텐츠 요약**: YouTube 자막을 API로 가져오거나 Whisper API로 음성을 변환합니다.

### 포맷별 요약 깊이

**숏폼 (2단계 요약)**:
1. 핵심 메시지 (한 문장)
2. 훅 포인트 (시청자를 사로잡은 요소)

**롱폼 (4단계 요약)**:
1. 한 줄 핵심
2. 주요 논점 3~5개
3. 상세 요약
4. 맥락과 배경

### 대응 콘텐츠 대본 생성

**숏폼 대본 구조**:
- 훅 (0~3초): 강렬한 질문이나 반전
- 핵심 (3~45초): 문제 해결 내용
- 클로저 (45~60초): CTA 또는 반전
- 총 150~300자 내외

**롱폼 대본 구조**:
- 도입: 문제 공감 및 예고
- 본론: 해결책 상세 설명
- 결론: 요약 및 실행 방안
- 총 1,500~3,000자 내외

### 장면(Scene) 기반 대본 구조

캐릭터 정보를 포함한 장면별 대본 구조:

```typescript
interface ScriptScene {
  sceneNumber: number;
  sceneTitle: string;
  duration: number;  // 초
  
  // 등장 캐릭터
  characters: {
    characterId: number;
    characterName: string;
    action: string;  // 행동 묘사
  }[];
  
  // 대사/나레이션
  dialogues: {
    characterId: number | null;  // null이면 나레이션
    type: 'dialogue' | 'narration' | 'voiceover';
    text: string;
    emotion: string;  // 기쁨, 진지함, 궁금함 등
  }[];
  
  // 화면 설명 (이미지 생성용)
  visualDescription: string;
  cameraAngle: string;  // 클로즈업, 미디엄샷, 와이드샷
  
  // 자막
  subtitleText: string;
}

interface GeneratedScript {
  id: number;
  title: string;
  format: 'short' | 'long';
  totalDuration: number;
  
  // 캐릭터 목록
  characters: ScriptCharacter[];
  
  // 장면 목록
  scenes: ScriptScene[];
  
  // 전체 대본 텍스트
  fullScript: string;
  
  // 메타데이터
  metadata: {
    targetAudience: string;
    tone: string;
    keywords: string[];
  };
}
```

### 대본 생성 결과 UI

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 생성된 대본                                    [수정] [저장]  │
├─────────────────────────────────────────────────────────────────┤
│  제목: 직장인 다이어트 30일 챌린지                               │
│  포맷: 숏폼 (60초) | 장면: 5개 | 등장인물: 5명                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [장면 1] 오프닝 훅 (0:00-0:05)                                  │
│  ────────────────────────────────────────────                    │
│  🎬 화면: 지영이 체중계 위에서 한숨 쉬는 모습 (클로즈업)          │
│  👤 김지영: "또 찐 거야...? 회식이 문제야 진짜"                  │
│  📝 자막: 또 찐 거야...?                                         │
│                                                                  │
│  [장면 2] 문제 제기 (0:05-0:15)                                  │
│  ────────────────────────────────────────────                    │
│  🎬 화면: 사무실에서 야식 먹는 동료들 (와이드샷)                  │
│  👤 나레이션: "바쁜 직장인에게 다이어트란..."                    │
│  👤 최동료: "야 치킨 시켰다~"                                    │
│                                                                  │
│  [장면 3] 전문가 조언 (0:15-0:35)                                │
│  ────────────────────────────────────────────                    │
│  🎬 화면: 영양사와 상담하는 지영 (미디엄샷)                       │
│  👤 박영양: "하루 1,500kcal만 지켜도 충분해요"                   │
│  👤 이트레이너: "10분 스트레칭부터 시작하세요"                   │
│                                                                  │
│  [장면 4] 성공 사례 (0:35-0:50)                                  │
│  ────────────────────────────────────────────                    │
│  🎬 화면: 정멘토 Before/After (클로즈업)                         │
│  👤 정멘토: "저도 3개월 만에 10kg 뺐어요"                        │
│                                                                  │
│  [장면 5] CTA & 마무리 (0:50-0:60)                               │
│  ────────────────────────────────────────────                    │
│  🎬 화면: 밝게 웃는 지영 (클로즈업)                               │
│  👤 김지영: "오늘부터 같이 시작해볼까요?"                        │
│  📝 자막: 댓글로 다이어트 꿀팁 공유해주세요! 💪                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [이전: 캐릭터 수정]  [캐릭터 이미지 생성]  [다음: 영상 제작 →]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6단계: 캐릭터 및 장면 이미지 생성

대본의 등장인물과 각 장면에 맞는 이미지를 생성합니다.

### 이미지 생성 모델 설정

| 우선순위 | 모델 | 설명 |
|----------|------|------|
| 🥇 기본 | **models/gemini-3-pro-image-preview** | Google Gemini 3 Pro Image - 고품질 실사 이미지 |
| 🥈 대체1 | Midjourney v6 | 예술적 스타일, 일관성 우수 |
| 🥉 대체2 | DALL-E 3 | OpenAI, 프롬프트 이해도 높음 |
| 4 | Flux Pro | 빠른 생성 속도 |

### 이미지 유형

| 유형 | 설명 | 생성 수 |
|------|------|---------|
| 캐릭터 이미지 | 주인공 + 조연 4명 = 5명 | 5장 |
| 장면 이미지 | 각 Scene별 배경/상황 이미지 | 4~8장 |
| 썸네일 | 영상 대표 이미지 | 1~3장 |

### 포맷별 이미지 사양

| 구분 | 숏폼 | 롱폼 |
|------|------|------|
| 비율 | 9:16 (세로) | 16:9 (가로) |
| 해상도 | 1080×1920 | 1920×1080 |
| 캐릭터 이미지 | 5장 | 5장 |
| 장면 이미지 | 2~4컷 | 4~8컷 |
| 스타일 | 임팩트 강조, 클로즈업 | 상황 설명, 와이드샷 포함 |

### 통합 이미지 생성 워크플로우

```
┌─────────────────────────────────────────────────────────────────┐
│                    🖼️ 이미지 생성 워크플로우                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: 캐릭터 이미지 생성 (5장)                                │
│  ─────────────────────────────                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                       │
│  │ ⭐  │ │ 👤  │ │ 👤  │ │ 👤  │ │ 👤  │                       │
│  │주인공│ │조연1│ │조연2│ │조연3│ │조연4│                       │
│  │김지영│ │박영양│ │이트레│ │최동료│ │정멘토│                      │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                       │
│     ✅       ✅       ⏳       ⬜       ⬜                        │
│                                                                  │
│  Step 2: 장면 이미지 생성 (5장)                                  │
│  ─────────────────────────────                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                            │
│  │ Scene 1 │ │ Scene 2 │ │ Scene 3 │ ...                        │
│  │ 오프닝  │ │ 사무실  │ │ 상담실  │                            │
│  └─────────┘ └─────────┘ └─────────┘                            │
│       ⬜           ⬜           ⬜                                │
│                                                                  │
│  Step 3: 썸네일 생성 (1장)                                       │
│  ─────────────────────────                                       │
│  ┌───────────────────────┐                                       │
│  │      THUMBNAIL        │                                       │
│  │   "30일 다이어트"      │                                       │
│  └───────────────────────┘                                       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  진행률: ████████░░░░░░░░░░░░ 40%                                │
│  [일시정지]  [재생성]  [완료 후 영상 제작으로 이동 →]              │
└─────────────────────────────────────────────────────────────────┘
```

### 캐릭터 이미지 생성 서비스

```javascript
class CharacterImageGenerator {
  constructor(geminiImageService, db) {
    this.imageService = geminiImageService;
    this.db = db;
  }

  // 캐릭터 정보 → 이미지 프롬프트 변환
  buildCharacterPrompt(character, format = 'long') {
    const aspectRatio = format === 'short' ? '9:16' : '16:9';
    const genderText = character.gender === 'female' ? 'woman' : 'man';
    
    return `
Professional portrait photo of a Korean ${genderText} in ${character.age_range || 'their 30s'},
Role: ${character.character_type || 'professional'},
Appearance: ${character.appearance_description || 'clean and modern look'},
Clothing: ${character.clothing_style || 'smart casual'},
Expression: ${character.personality ? character.personality.split(',')[0] : 'friendly and approachable'},
Background: clean studio background with soft lighting,
Style: photorealistic, high resolution, 8K, professional headshot,
Aspect ratio: ${aspectRatio}
    `.trim();
  }

  // 단일 캐릭터 이미지 생성
  async generateSingleCharacter(characterId, format = 'long') {
    const character = await this.getCharacter(characterId);
    const prompt = this.buildCharacterPrompt(character, format);
    
    // 이미지 생성
    const result = await this.imageService.generateImage(prompt, { format });
    
    // 파일 저장
    const fileName = this.sanitizeFileName(
      `char_${character.role}_${character.character_name}.png`
    );
    const filePath = await this.saveToStorage(result.data, character.session_id, fileName);
    
    // DB 업데이트
    await this.db.execute(
      `UPDATE script_characters 
       SET image_prompt = ?, generated_image_path = ?, generated_image_url = ?
       WHERE id = ?`,
      [prompt, filePath, this.getPublicUrl(filePath), characterId]
    );
    
    return { characterId, filePath, prompt };
  }

  // 전체 캐릭터 일괄 생성 (5명)
  async generateAllCharacters(sessionId, format = 'long') {
    const characters = await this.getCharactersBySession(sessionId);
    const results = [];
    
    // 주인공 먼저, 그 다음 조연 순서로 생성
    const sortedCharacters = characters.sort((a, b) => {
      if (a.role === 'protagonist') return -1;
      if (b.role === 'protagonist') return 1;
      return 0;
    });
    
    for (let i = 0; i < sortedCharacters.length; i++) {
      const character = sortedCharacters[i];
      
      // 진행 상태 업데이트
      await this.updateProgress(sessionId, 'character', i + 1, sortedCharacters.length);
      
      try {
        const result = await this.generateSingleCharacter(character.id, format);
        results.push({ ...result, success: true, name: character.character_name });
      } catch (error) {
        results.push({ 
          characterId: character.id, 
          success: false, 
          error: error.message,
          name: character.character_name 
        });
      }
      
      // API 레이트 리밋 방지 (2초 대기)
      if (i < sortedCharacters.length - 1) {
        await this.delay(2000);
      }
    }
    
    return results;
  }
}
```

### 장면 이미지 생성 서비스

```javascript
class SceneImageGenerator {
  constructor(geminiImageService, db) {
    this.imageService = geminiImageService;
    this.db = db;
  }

  // 장면 정보 → 이미지 프롬프트 변환
  buildScenePrompt(scene, characters, format = 'long') {
    const aspectRatio = format === 'short' ? '9:16' : '16:9';
    
    // 등장 캐릭터 정보
    const characterDescriptions = scene.characters.map(sc => {
      const char = characters.find(c => c.id === sc.characterId);
      return char ? `${char.character_name} (${char.appearance_description})` : '';
    }).filter(Boolean).join(', ');
    
    return `
Cinematic scene: ${scene.visualDescription},
Characters in scene: ${characterDescriptions || 'no characters visible'},
Camera angle: ${scene.cameraAngle || 'medium shot'},
Setting: ${scene.sceneTitle},
Mood: ${scene.dialogues[0]?.emotion || 'neutral'},
Style: photorealistic, cinematic lighting, professional video frame,
High resolution, 8K quality,
Aspect ratio: ${aspectRatio}
    `.trim();
  }

  // 전체 장면 이미지 생성
  async generateAllSceneImages(scriptId, format = 'long') {
    const script = await this.getScript(scriptId);
    const characters = await this.getCharactersByScript(scriptId);
    const results = [];
    
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      
      // 진행 상태 업데이트
      await this.updateProgress(scriptId, 'scene', i + 1, script.scenes.length);
      
      try {
        const prompt = this.buildScenePrompt(scene, characters, format);
        const result = await this.imageService.generateImage(prompt, { format });
        
        // 파일 저장
        const fileName = `scene_${String(i + 1).padStart(2, '0')}_${this.sanitize(scene.sceneTitle)}.png`;
        const filePath = await this.saveToStorage(result.data, scriptId, fileName);
        
        // DB 저장
        await this.saveSceneImage(scriptId, scene.sceneNumber, filePath, prompt);
        
        results.push({ 
          sceneNumber: scene.sceneNumber, 
          sceneTitle: scene.sceneTitle,
          success: true, 
          filePath 
        });
      } catch (error) {
        results.push({ 
          sceneNumber: scene.sceneNumber, 
          success: false, 
          error: error.message 
        });
      }
      
      // API 레이트 리밋 방지
      if (i < script.scenes.length - 1) {
        await this.delay(2000);
      }
    }
    
    return results;
  }
}
```

### 통합 이미지 생성 API

```javascript
// API 엔드포인트
// POST /api/images/generate-all
async function generateAllImages(req, res) {
  const { scriptId, format } = req.body;
  
  const characterGenerator = new CharacterImageGenerator(geminiService, db);
  const sceneGenerator = new SceneImageGenerator(geminiService, db);
  
  try {
    // 1. 캐릭터 이미지 생성 (5장)
    const characterResults = await characterGenerator.generateAllCharacters(
      scriptId, 
      format
    );
    
    // 2. 장면 이미지 생성
    const sceneResults = await sceneGenerator.generateAllSceneImages(
      scriptId, 
      format
    );
    
    // 3. 썸네일 생성
    const thumbnailResult = await generateThumbnail(scriptId, format);
    
    res.json({
      success: true,
      characters: characterResults,
      scenes: sceneResults,
      thumbnail: thumbnailResult,
      totalImages: characterResults.length + sceneResults.length + 1
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### 이미지 생성 결과 UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🖼️ 생성된 이미지 (11장)                         [전체 다운로드]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👥 캐릭터 이미지 (5장)                                          │
│  ┌───────┬───────┬───────┬───────┬───────┐                      │
│  │  ⭐   │  👤   │  👤   │  👤   │  👤   │                      │
│  │[김지영]│[박영양]│[이트레]│[최동료]│[정멘토]│                      │
│  │ 재생성 │ 재생성 │ 재생성 │ 재생성 │ 재생성 │                      │
│  └───────┴───────┴───────┴───────┴───────┘                      │
│                                                                  │
│  🎬 장면 이미지 (5장)                                            │
│  ┌───────┬───────┬───────┬───────┬───────┐                      │
│  │Scene1 │Scene2 │Scene3 │Scene4 │Scene5 │                      │
│  │오프닝 │사무실 │상담실 │성공사례│마무리 │                      │
│  │ 재생성 │ 재생성 │ 재생성 │ 재생성 │ 재생성 │                      │
│  └───────┴───────┴───────┴───────┴───────┘                      │
│                                                                  │
│  🎨 썸네일 (1장)                                                 │
│  ┌─────────────────┐                                             │
│  │   THUMBNAIL     │  [재생성] [편집]                            │
│  └─────────────────┘                                             │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [← 대본 수정]                              [영상 제작으로 이동 →] │
└─────────────────────────────────────────────────────────────────┘
```

### Gemini 3 Pro Image 이미지 생성 구현

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

class ImageGenerationService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.defaultModel = 'models/gemini-3-pro-image-preview';
  }

  async generateImage(prompt, options = {}) {
    const model = this.genAI.getGenerativeModel({ 
      model: options.modelId || this.defaultModel 
    });
    
    const format = options.format || 'long';
    const aspectRatio = format === 'short' ? '9:16' : '16:9';
    const resolution = format === 'short' ? '1080x1920' : '1920x1080';
    
    const enhancedPrompt = `
${prompt}

Technical specifications:
- Style: Photorealistic, cinematic quality
- Resolution: ${resolution}, 8K detail
- Aspect Ratio: ${aspectRatio}
- Lighting: Professional, natural lighting
- Quality: Ultra high definition, sharp focus
`;

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
        generationConfig: {
          responseModalities: ['image', 'text'],
          responseMimeType: 'image/png'
        }
      });

      const response = await result.response;
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return {
            success: true,
            mimeType: part.inlineData.mimeType,
            data: part.inlineData.data,
            prompt: enhancedPrompt
          };
        }
      }
      
      throw new Error('이미지 데이터를 찾을 수 없습니다');
    } catch (error) {
      console.error('Imagen 생성 실패:', error);
      throw error;
    }
  }

  async generateSceneImages(script, format = 'long', outputDir) {
    const scenes = this.extractScenes(script, format);
    const results = [];
    
    for (let i = 0; i < scenes.length; i++) {
      console.log(`이미지 생성 중: ${i + 1}/${scenes.length} - ${scenes[i].name}`);
      
      const image = await this.generateImage(scenes[i].prompt, { format });
      
      // 파일 저장
      const fileName = `scene_${String(i + 1).padStart(2, '0')}.png`;
      const filePath = path.join(outputDir, fileName);
      await fs.writeFile(filePath, Buffer.from(image.data, 'base64'));
      
      results.push({
        sequence: i + 1,
        sceneName: scenes[i].name,
        fileName,
        filePath,
        prompt: scenes[i].prompt
      });
      
      // API 레이트 리밋 방지
      await this.delay(2000);
    }
    
    return results;
  }

  extractScenes(script, format) {
    // 대본에서 장면 추출 및 이미지 프롬프트 생성
    const scenes = [];
    const maxScenes = format === 'short' ? 4 : 8;
    
    // 대본 구조 파싱 (예: [도입부], [본론1] 등)
    const sectionRegex = /\[([^\]]+)\][:\s]*([\s\S]*?)(?=\[|$)/g;
    let match;
    
    while ((match = sectionRegex.exec(script)) !== null && scenes.length < maxScenes) {
      const sectionName = match[1];
      const sectionContent = match[2].trim();
      
      scenes.push({
        name: sectionName,
        content: sectionContent.substring(0, 200),
        prompt: this.generatePromptFromContent(sectionName, sectionContent)
      });
    }
    
    return scenes;
  }

  generatePromptFromContent(sectionName, content) {
    // 섹션 내용을 기반으로 이미지 프롬프트 생성
    const basePrompt = `Professional Korean content creator, ${sectionName} scene`;
    
    // 키워드 추출 및 프롬프트 강화
    if (content.includes('다이어트') || content.includes('운동')) {
      return `${basePrompt}, fitness and health theme, modern gym or kitchen setting, motivational atmosphere`;
    }
    
    if (content.includes('비즈니스') || content.includes('성공')) {
      return `${basePrompt}, professional business setting, modern office, confident pose`;
    }
    
    return `${basePrompt}, clean modern background, engaging expression, professional lighting`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 사용 예시
async function generateContentImages(scriptId) {
  const imageService = new ImageGenerationService(process.env.GEMINI_API_KEY);
  const script = await getScriptById(scriptId);
  const outputDir = `/storage/projects/${script.projectId}/${script.videoId}/images`;
  
  await fs.mkdir(outputDir, { recursive: true });
  
  const images = await imageService.generateSceneImages(
    script.fullScript,
    script.contentFormat,
    outputDir
  );
  
  // DB에 이미지 정보 저장
  for (const img of images) {
    await saveGeneratedAsset(scriptId, {
      type: 'image',
      fileName: img.fileName,
      filePath: img.filePath,
      imagePrompt: img.prompt,
      imageSequence: img.sequence,
      imageResolution: script.contentFormat === 'short' ? '1080x1920' : '1920x1080',
      status: 'completed'
    });
  }
  
  return images;
}
```

### Google Sheets: AI 모델 설정 시트

| 용도 | 기본모델 | 프로바이더 | 모델ID | 활성 |
|------|----------|------------|--------|------|
| 댓글분석 | ✓ | Google | models/gemini-3-pro-preview | ✓ |
| 댓글분석 | | Anthropic | claude-sonnet-4-20250514 | ✓ |
| 이미지생성 | ✓ | Google | models/gemini-3-pro-image-preview | ✓ |
| 이미지생성 | | OpenAI | dall-e-3 | ✓ |

숏폼은 세로 화면에서 인물이 크게 보이도록 클로즈업 위주로, 롱폼은 상황 맥락을 보여주는 미디엄샷과 와이드샷을 섞어 구성합니다.

---

## 7단계: 영상 제작 (이미지 + 음성 + 자막)

### 음성 합성 (TTS)

**권장 API**: ElevenLabs API

| 구분 | 숏폼 | 롱폼 |
|------|------|------|
| 속도 | 1.1~1.2배 | 1.0배 |
| 톤 | 에너지 높은 톤 | 차분하고 신뢰감 있는 톤 |

### 자막 스타일

| 구분 | 숏폼 | 롱폼 |
|------|------|------|
| 위치 | 화면 중앙 배치 | 화면 하단 고정 |
| 폰트 | 48~64pt | 32~40pt |
| 단위 | 한 번에 2~3단어씩 | 한 문장 단위 |
| 효과 | 강조 색상, 애니메이션 | 반투명 배경 |

### 영상 합성 (FFmpeg/Remotion)

**숏폼 인코딩 설정**:
- 해상도: 1080×1920
- 프레임레이트: 30fps
- 코덱: H.264
- 메타데이터: 세로 모드 포함

**롱폼 인코딩 설정**:
- 해상도: 1920×1080
- 프레임레이트: 30fps
- 코덱: H.264

숏폼은 빠른 컷 전환(2~5초 간격)과 줌 효과를 강하게, 롱폼은 자연스러운 전환(5~15초 간격)과 부드러운 Ken Burns 효과를 적용합니다.

---

## 8단계: 마크다운 리포트 다운로드

각 분석 단계의 결과와 생성된 에셋 정보를 마크다운 파일로 다운로드할 수 있습니다.

### 파일명 생성 규칙

```
{영상제목}_{분석일자}_{포맷}.md

예시:
- "다이어트_성공비결_20241215_롱폼.md"
- "1분운동루틴_20241215_숏폼.md"
```

특수문자와 공백은 언더스코어로 치환하고, 파일명이 너무 길 경우 50자로 truncate합니다.

### 마크다운 파일 구조

```markdown
# YouTube 콘텐츠 분석 리포트

## 기본 정보
- **분석 일시**: 2024-12-15 14:30:25
- **콘텐츠 포맷**: 롱폼
- **원본 영상**: [영상 제목](https://youtube.com/watch?v=VIDEO_ID)
- **채널**: 채널명 (구독자 125,000명)
- **터짐 등급**: S등급 (터짐 지수: 15.3)

---

## 영상 통계
| 항목 | 수치 |
|------|------|
| 조회수 | 1,912,500 |
| 좋아요 | 45,230 |
| 댓글수 | 3,421 |
| 업로드일 | 2024-12-10 |
| 영상 길이 | 8분 32초 |

---

## 댓글 분석 결과

### 긍정 댓글 요약
분석된 댓글 중 72%가 긍정적 반응을 보였습니다.

**주요 칭찬 포인트**:
- 설명이 명확하고 이해하기 쉬움
- 실제 적용 가능한 실용적인 팁 제공
- 진정성 있는 경험 공유

**대표 키워드**: 유익함, 감사, 구독, 도움됨

### 부정 댓글 요약
분석된 댓글 중 28%가 부정적 또는 개선 요구 의견이었습니다.

**주요 불만 사항**:
- 초보자에게는 설명이 부족함
- 특정 상황에 대한 예외 케이스 미언급
- 영상 길이가 너무 김

**개선 요구사항**: 단계별 상세 설명, 요약본 제공

---

## 원본 콘텐츠 요약

### 1. 핵심 메시지 (한 줄)
효과적인 다이어트는 극단적 식이제한이 아닌 지속 가능한 습관 형성에 있다.

### 2. 주요 논점
- 칼로리 적자의 올바른 이해
- 단백질 섭취의 중요성
- 운동과 식단의 균형
- 심리적 접근법

### 3. 상세 요약
(각 논점별 2~3문장 설명)

### 4. 맥락과 배경
(해당 주제가 왜 중요한지, 현재 트렌드와의 연관성)

---

## 생성된 대본

### 대본 개요
- **목적**: 부정 댓글의 "초보자 설명 부족" 문제 해결
- **타겟**: 다이어트 입문자
- **예상 길이**: 7분 30초

### 전체 대본

#### [도입부] (0:00 ~ 1:00)
"다이어트를 시작하려는데 어디서부터 해야 할지 막막하셨죠?
오늘은 완전 초보자도 바로 따라할 수 있는 단계별 가이드를 준비했습니다..."

#### [본론 1] (1:00 ~ 3:00)
(상세 대본 내용)

#### [본론 2] (3:00 ~ 5:30)
(상세 대본 내용)

#### [결론] (5:30 ~ 7:30)
(상세 대본 내용)

---

## 생성된 에셋

### 이미지 파일
| 순번 | 파일명 | 용도 | 해상도 |
|------|--------|------|--------|
| 1 | 다이어트_성공비결_img_01.png | 도입부 | 1920×1080 |
| 2 | 다이어트_성공비결_img_02.png | 본론1 | 1920×1080 |
| 3 | 다이어트_성공비결_img_03.png | 본론2 | 1920×1080 |
| 4 | 다이어트_성공비결_img_04.png | 결론 | 1920×1080 |

### 음성 파일
| 파일명 | 길이 | TTS 설정 |
|--------|------|----------|
| 다이어트_성공비결_voice.mp3 | 7분 32초 | ElevenLabs, 속도 1.0x |

### 자막 파일
| 파일명 | 형식 | 라인수 |
|--------|------|--------|
| 다이어트_성공비결_subtitle.srt | SRT | 156 |

### 최종 영상
| 파일명 | 해상도 | 길이 | 용량 |
|--------|--------|------|------|
| 다이어트_성공비결_final.mp4 | 1920×1080 | 7분 32초 | 245MB |

---

## 업로드 메타데이터 (제안)

### 제목
다이어트 완전 초보 가이드 | 오늘부터 바로 시작하는 3단계

### 설명
(SEO 최적화된 설명문)

### 태그
다이어트, 체중감량, 초보자가이드, 건강, 식단관리, 운동

### 썸네일 텍스트 제안
"초보도 가능!" / "3단계로 끝"

---

## 메타 정보
- **생성 도구**: YouTube Content Automation Pipeline v3
- **Claude 모델**: claude-3-opus
- **이미지 생성**: Midjourney v6
- **TTS**: ElevenLabs
- **리포트 생성일**: 2024-12-15 14:35:42
```

### 다운로드 버튼 구현

UI에서 각 단계별로 개별 다운로드와 전체 리포트 다운로드를 제공합니다.

**개별 다운로드 옵션**:
- 댓글 분석만 다운로드: `{제목}_댓글분석.md`
- 대본만 다운로드: `{제목}_대본.md`
- 에셋 목록만 다운로드: `{제목}_에셋목록.md`

**전체 리포트 다운로드**:
- 모든 내용 포함: `{제목}_전체리포트.md`

### 파일명 생성 함수

```javascript
function generateFileName(videoTitle, contentType, format) {
  // 특수문자 제거 및 공백을 언더스코어로 변환
  const sanitizedTitle = videoTitle
    .replace(/[^\w\sㄱ-힣]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const formatLabel = format === 'short' ? '숏폼' : '롱폼';
  
  // contentType: 'comments', 'script', 'assets', 'full'
  const typeLabels = {
    comments: '댓글분석',
    script: '대본',
    assets: '에셋목록',
    full: '전체리포트'
  };
  
  return `${sanitizedTitle}_${date}_${formatLabel}_${typeLabels[contentType]}.md`;
}

// 예시 출력
// "다이어트_성공비결_20241215_롱폼_전체리포트.md"
// "다이어트_성공비결_20241215_롱폼_댓글분석.md"
```

### 이미지/영상 파일명 규칙

```javascript
function generateAssetFileName(videoTitle, assetType, index, format) {
  const sanitizedTitle = videoTitle
    .replace(/[^\w\sㄱ-힣]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);
  
  const extensions = {
    image: 'png',
    voice: 'mp3',
    subtitle: 'srt',
    video: 'mp4'
  };
  
  const formatSuffix = format === 'short' ? '_shorts' : '';
  
  if (assetType === 'image') {
    return `${sanitizedTitle}${formatSuffix}_img_${String(index).padStart(2, '0')}.${extensions[assetType]}`;
  }
  
  return `${sanitizedTitle}${formatSuffix}_${assetType}.${extensions[assetType]}`;
}

// 예시 출력
// "다이어트_성공비결_img_01.png"
// "다이어트_성공비결_img_02.png"
// "다이어트_성공비결_voice.mp3"
// "다이어트_성공비결_subtitle.srt"
// "다이어트_성공비결_final.mp4"
// 숏폼인 경우:
// "다이어트_성공비결_shorts_img_01.png"
// "다이어트_성공비결_shorts_final.mp4"
```

---

## 9단계: YouTube 업로드 자동화

**사용 API**: YouTube Data API v3의 videos.insert 엔드포인트

OAuth 2.0 인증이 필요하며, 업로드 시 제목, 설명, 태그, 카테고리, 공개 설정을 함께 지정합니다. 썸네일은 별도의 thumbnails.set 엔드포인트로 업로드합니다.

### 포맷별 업로드 설정

**숏폼**:
- 제목에 #Shorts 해시태그 포함
- 세로 영상 메타데이터 설정
- 60초 이하 제한
- 숏폼 트렌드에 맞는 태그 조정

**롱폼**:
- 상세한 설명과 타임스탬프 포함
- 엔드스크린과 카드 설정
- 재생목록 연결

업로드 후 반환되는 영상 ID를 저장해두면 이후 성과 추적에 활용할 수 있습니다. 예약 업로드 기능도 API에서 지원하므로 최적 시간대에 공개되도록 설정할 수 있습니다.

---

## 전체 아키텍처 요약

```
[포맷 선택: 숏폼/롱폼(기본)]
     ↓
[키워드 입력]
     ↓
[YouTube API] → 포맷별 필터링 검색 → 채널 정보 병합
     ↓
[터짐 지수 계산] → 5단계 분류 → 테이블 UI 표시
     ↓
[영상 선택] → 댓글 수집 → [Claude API] → 긍정/부정 분류 및 요약
     ↓                              ↓
     ↓                    [📥 댓글분석.md 다운로드]
     ↓
[자막/음성 추출] → [Claude API] → 포맷별 콘텐츠 요약
     ↓
[부정 피드백 + 요약] → [Claude API] → 포맷별 대본 생성
     ↓                              ↓
     ↓                    [📥 대본.md 다운로드]
     ↓
[대본 파싱] → [이미지 API] → 포맷별 비율로 이미지 생성
     ↓                              ↓
     ↓                    [📥 이미지 파일 다운로드]
     ↓
[대본] → [TTS API] → 포맷별 속도/톤으로 음성 생성
     ↓
[이미지 + 음성 + 자막] → [FFmpeg] → 포맷별 사양으로 영상 인코딩
     ↓                              ↓
     ↓                    [📥 최종영상.mp4 다운로드]
     ↓
[📥 전체리포트.md 다운로드]
     ↓
[YouTube API] → 포맷별 메타데이터로 업로드 → 완료
```

---

## 설정 데이터 구조

```javascript
const ContentConfig = {
  format: "long" | "short",  // 기본값: "long"
  
  // 포맷에 따라 자동 설정되는 값들
  video: {
    aspectRatio: format === "short" ? "9:16" : "16:9",
    resolution: format === "short" ? "1080x1920" : "1920x1080",
    maxDuration: format === "short" ? 60 : 900,
  },
  
  script: {
    maxLength: format === "short" ? 300 : 3000,
    structure: format === "short" 
      ? ["hook", "core", "closer"] 
      : ["intro", "body", "conclusion"],
  },
  
  images: {
    count: format === "short" ? 4 : 8,
    style: format === "short" ? "closeup" : "mixed",
  },
  
  tts: {
    speed: format === "short" ? 1.15 : 1.0,
    tone: format === "short" ? "energetic" : "calm",
  },
  
  subtitles: {
    position: format === "short" ? "center" : "bottom",
    fontSize: format === "short" ? 56 : 36,
  }
};
```

---

## 기술적 고려사항

### API 비용 관리
YouTube API는 일일 할당량(기본 10,000 유닛)이 있으므로 캐싱 전략이 중요합니다. Claude API와 이미지 생성 API는 토큰/이미지당 과금되므로 배치 처리로 효율화합니다.

### 에러 처리
각 API 호출 단계에서 실패 시 재시도 로직과 폴백 옵션을 구현해야 합니다. 특히 이미지 생성은 품질이 일정하지 않을 수 있어 검수 단계를 넣는 것이 좋습니다.

### 저작권
원본 영상의 내용을 직접 사용하지 않고, 분석과 요약을 바탕으로 새로운 콘텐츠를 만드는 것이므로 저작권 문제는 적지만, 댓글 내용을 직접 인용하거나 원본 영상 클립을 사용하는 것은 피해야 합니다.

### 포맷 전환의 유연성
동일한 분석 결과로 숏폼과 롱폼 모두 생성할 수 있도록 파이프라인을 설계하면, 하나의 콘텐츠 기획으로 두 가지 버전을 동시에 제작할 수 있습니다.

### 숏폼 특화 최적화
숏폼은 첫 1~3초가 핵심이므로 대본 생성 시 "훅"에 대한 가중치를 높이고, Claude 프롬프트에 "스크롤을 멈추게 할 첫 문장"을 명시적으로 요청합니다.

### 마크다운 렌더링 호환성
생성되는 마크다운은 GitHub Flavored Markdown(GFM) 표준을 따라 대부분의 마크다운 뷰어에서 올바르게 렌더링됩니다.

### 파일 인코딩
한글 파일명과 내용을 위해 UTF-8 인코딩을 사용합니다. 다운로드 시 BOM(Byte Order Mark)을 포함하면 Windows 메모장에서도 한글이 깨지지 않습니다.

### ZIP 번들 다운로드
이미지, 음성, 자막, 영상, 마크다운 리포트를 하나의 ZIP 파일로 묶어 다운로드하는 옵션도 제공하면 편리합니다. 파일명은 `{제목}_{날짜}_패키지.zip` 형식으로 합니다.

---

## 10단계: MariaDB 데이터베이스 연동

모든 분석 데이터, 생성된 에셋 정보, 파일 경로를 MariaDB에 저장하여 이력 관리 및 검색이 가능하도록 합니다.

### 데이터베이스 스키마 설계

#### 1. 프로젝트 테이블 (projects)

```sql
CREATE TABLE projects (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(200) NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    content_format ENUM('short', 'long') DEFAULT 'long',
    status ENUM('searching', 'analyzing', 'generating', 'completed', 'failed') DEFAULT 'searching',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_keyword (keyword),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2. 선택 영상 테이블 (selected_videos)

```sql
CREATE TABLE selected_videos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    video_id VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    channel_id VARCHAR(30) NOT NULL,
    channel_name VARCHAR(200),
    subscriber_count BIGINT DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    duration_seconds INT DEFAULT 0,
    published_at DATETIME,
    thumbnail_url VARCHAR(500),
    viral_score DECIMAL(10,4) DEFAULT 0,
    viral_grade ENUM('S', 'A', 'B', 'C', 'D') DEFAULT 'C',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_viral_grade (viral_grade),
    INDEX idx_viral_score (viral_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 3. 댓글 분석 테이블 (comment_analysis)

```sql
CREATE TABLE comment_analysis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id BIGINT NOT NULL,
    total_comments_analyzed INT DEFAULT 0,
    positive_count INT DEFAULT 0,
    negative_count INT DEFAULT 0,
    positive_ratio DECIMAL(5,2) DEFAULT 0,
    positive_summary TEXT,
    positive_keywords JSON,
    negative_summary TEXT,
    negative_keywords JSON,
    improvement_suggestions TEXT,
    raw_comments_json LONGTEXT,
    analysis_model VARCHAR(50) DEFAULT 'claude-3-opus',
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES selected_videos(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_positive_ratio (positive_ratio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 4. 콘텐츠 요약 테이블 (content_summaries)

```sql
CREATE TABLE content_summaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id BIGINT NOT NULL,
    original_transcript LONGTEXT,
    one_line_summary VARCHAR(500),
    key_points JSON,
    detailed_summary TEXT,
    context_background TEXT,
    summary_level ENUM('2-step', '4-step') DEFAULT '4-step',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES selected_videos(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 5. 생성 대본 테이블 (generated_scripts)

```sql
CREATE TABLE generated_scripts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id BIGINT NOT NULL,
    script_purpose VARCHAR(500),
    target_audience VARCHAR(200),
    expected_duration_seconds INT DEFAULT 0,
    script_structure JSON,
    full_script LONGTEXT NOT NULL,
    hook_text TEXT,
    intro_text TEXT,
    body_text LONGTEXT,
    conclusion_text TEXT,
    content_format ENUM('short', 'long') DEFAULT 'long',
    word_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES selected_videos(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_content_format (content_format)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 6. 생성 에셋 테이블 (generated_assets)

```sql
CREATE TABLE generated_assets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    script_id BIGINT NOT NULL,
    asset_type ENUM('image', 'voice', 'subtitle', 'video', 'report') NOT NULL,
    file_name VARCHAR(300) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    file_url VARCHAR(500),
    
    -- 이미지 전용 필드
    image_prompt TEXT,
    image_resolution VARCHAR(20),
    image_sequence INT,
    
    -- 음성 전용 필드
    voice_duration_seconds DECIMAL(10,2),
    tts_provider VARCHAR(50),
    tts_voice_id VARCHAR(100),
    tts_speed DECIMAL(3,2) DEFAULT 1.0,
    
    -- 자막 전용 필드
    subtitle_format ENUM('srt', 'vtt', 'ass') DEFAULT 'srt',
    subtitle_line_count INT,
    
    -- 영상 전용 필드
    video_resolution VARCHAR(20),
    video_duration_seconds DECIMAL(10,2),
    video_codec VARCHAR(20),
    video_fps INT,
    
    -- 공통
    generation_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (script_id) REFERENCES generated_scripts(id) ON DELETE CASCADE,
    INDEX idx_script_id (script_id),
    INDEX idx_asset_type (asset_type),
    INDEX idx_generation_status (generation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 7. YouTube 업로드 이력 테이블 (upload_history)

```sql
CREATE TABLE upload_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    asset_id BIGINT NOT NULL,
    youtube_video_id VARCHAR(20),
    upload_title VARCHAR(200) NOT NULL,
    upload_description TEXT,
    upload_tags JSON,
    upload_category_id INT,
    privacy_status ENUM('public', 'unlisted', 'private') DEFAULT 'private',
    scheduled_publish_at DATETIME,
    actual_published_at DATETIME,
    upload_status ENUM('pending', 'uploading', 'processing', 'published', 'failed') DEFAULT 'pending',
    thumbnail_url VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (asset_id) REFERENCES generated_assets(id) ON DELETE CASCADE,
    INDEX idx_youtube_video_id (youtube_video_id),
    INDEX idx_upload_status (upload_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 8. 전체 리포트 테이블 (full_reports)

```sql
CREATE TABLE full_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    video_id BIGINT NOT NULL,
    report_type ENUM('comments', 'script', 'assets', 'full') DEFAULT 'full',
    file_name VARCHAR(300) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    markdown_content LONGTEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES selected_videos(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_report_type (report_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Node.js 연동 코드 예시

```javascript
const mysql = require('mysql2/promise');

// 커넥션 풀 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'youtube_app',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'youtube_automation',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 프로젝트 생성
async function createProject(projectName, keyword, contentFormat = 'long') {
  const [result] = await pool.execute(
    'INSERT INTO projects (project_name, keyword, content_format) VALUES (?, ?, ?)',
    [projectName, keyword, contentFormat]
  );
  return result.insertId;
}

// 선택 영상 저장
async function saveSelectedVideo(projectId, videoData) {
  const [result] = await pool.execute(`
    INSERT INTO selected_videos 
    (project_id, video_id, title, channel_id, channel_name, subscriber_count, 
     view_count, like_count, comment_count, duration_seconds, published_at, 
     thumbnail_url, viral_score, viral_grade)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    projectId, videoData.videoId, videoData.title, videoData.channelId,
    videoData.channelName, videoData.subscriberCount, videoData.viewCount,
    videoData.likeCount, videoData.commentCount, videoData.durationSeconds,
    videoData.publishedAt, videoData.thumbnailUrl, videoData.viralScore,
    videoData.viralGrade
  ]);
  return result.insertId;
}

// 댓글 분석 결과 저장
async function saveCommentAnalysis(videoId, analysisData) {
  const [result] = await pool.execute(`
    INSERT INTO comment_analysis 
    (video_id, total_comments_analyzed, positive_count, negative_count,
     positive_ratio, positive_summary, positive_keywords, negative_summary,
     negative_keywords, improvement_suggestions, raw_comments_json, analysis_model)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    videoId, analysisData.totalComments, analysisData.positiveCount,
    analysisData.negativeCount, analysisData.positiveRatio,
    analysisData.positiveSummary, JSON.stringify(analysisData.positiveKeywords),
    analysisData.negativeSummary, JSON.stringify(analysisData.negativeKeywords),
    analysisData.improvementSuggestions, JSON.stringify(analysisData.rawComments),
    analysisData.model || 'claude-3-opus'
  ]);
  return result.insertId;
}

// 생성 대본 저장
async function saveGeneratedScript(videoId, scriptData) {
  const [result] = await pool.execute(`
    INSERT INTO generated_scripts 
    (video_id, script_purpose, target_audience, expected_duration_seconds,
     script_structure, full_script, hook_text, intro_text, body_text,
     conclusion_text, content_format, word_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    videoId, scriptData.purpose, scriptData.targetAudience,
    scriptData.expectedDuration, JSON.stringify(scriptData.structure),
    scriptData.fullScript, scriptData.hook, scriptData.intro,
    scriptData.body, scriptData.conclusion, scriptData.format,
    scriptData.wordCount
  ]);
  return result.insertId;
}

// 생성 에셋 저장
async function saveGeneratedAsset(scriptId, assetData) {
  const [result] = await pool.execute(`
    INSERT INTO generated_assets 
    (script_id, asset_type, file_name, file_path, file_size_bytes, file_url,
     image_prompt, image_resolution, image_sequence, voice_duration_seconds,
     tts_provider, tts_voice_id, tts_speed, subtitle_format, subtitle_line_count,
     video_resolution, video_duration_seconds, video_codec, video_fps, generation_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    scriptId, assetData.type, assetData.fileName, assetData.filePath,
    assetData.fileSize, assetData.fileUrl, assetData.imagePrompt,
    assetData.imageResolution, assetData.imageSequence, assetData.voiceDuration,
    assetData.ttsProvider, assetData.ttsVoiceId, assetData.ttsSpeed,
    assetData.subtitleFormat, assetData.subtitleLineCount, assetData.videoResolution,
    assetData.videoDuration, assetData.videoCodec, assetData.videoFps,
    assetData.status || 'completed'
  ]);
  return result.insertId;
}

// 전체 리포트 저장
async function saveFullReport(projectId, videoId, reportData) {
  const [result] = await pool.execute(`
    INSERT INTO full_reports 
    (project_id, video_id, report_type, file_name, file_path, 
     file_size_bytes, markdown_content)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    projectId, videoId, reportData.type, reportData.fileName,
    reportData.filePath, reportData.fileSize, reportData.markdownContent
  ]);
  return result.insertId;
}

// 프로젝트 전체 데이터 조회 (JOIN)
async function getProjectFullData(projectId) {
  const [rows] = await pool.execute(`
    SELECT 
      p.*,
      sv.video_id, sv.title as video_title, sv.viral_score, sv.viral_grade,
      ca.positive_summary, ca.negative_summary, ca.positive_ratio,
      gs.full_script, gs.word_count,
      ga.asset_type, ga.file_name, ga.file_path, ga.file_url
    FROM projects p
    LEFT JOIN selected_videos sv ON p.id = sv.project_id
    LEFT JOIN comment_analysis ca ON sv.id = ca.video_id
    LEFT JOIN generated_scripts gs ON sv.id = gs.video_id
    LEFT JOIN generated_assets ga ON gs.id = ga.script_id
    WHERE p.id = ?
    ORDER BY ga.asset_type, ga.image_sequence
  `, [projectId]);
  return rows;
}

module.exports = {
  pool,
  createProject,
  saveSelectedVideo,
  saveCommentAnalysis,
  saveGeneratedScript,
  saveGeneratedAsset,
  saveFullReport,
  getProjectFullData
};
```

### ER 다이어그램

```
┌─────────────┐       ┌──────────────────┐       ┌───────────────────┐
│  projects   │──1:N──│ selected_videos  │──1:1──│ comment_analysis  │
└─────────────┘       └──────────────────┘       └───────────────────┘
       │                      │
       │                      ├──1:1──┌───────────────────┐
       │                      │       │ content_summaries │
       │                      │       └───────────────────┘
       │                      │
       │                      └──1:N──┌───────────────────┐
       │                              │ generated_scripts │
       │                              └───────────────────┘
       │                                      │
       │                                      └──1:N──┌──────────────────┐
       │                                              │ generated_assets │
       │                                              └──────────────────┘
       │                                                      │
       │                                                      └──1:1──┌────────────────┐
       │                                                              │ upload_history │
       │                                                              └────────────────┘
       │
       └──1:N──┌──────────────┐
               │ full_reports │
               └──────────────┘
```

---

## 11단계: Google Sheets 연동 (엑셀 형태 저장)

분석 결과와 에셋 정보를 Google Sheets에 실시간으로 동기화하여 팀 협업 및 데이터 관리를 용이하게 합니다.

### Google Sheets API 설정

1. Google Cloud Console에서 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 및 JSON 키 다운로드
4. 스프레드시트에 서비스 계정 이메일 공유 권한 부여

### 시트 구조 설계

#### Sheet 1: 프로젝트 목록 (Projects)

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| 프로젝트ID | 프로젝트명 | 키워드 | 포맷 | 상태 | 생성일 | 수정일 |
| 1 | 다이어트 시리즈 | 다이어트 | 롱폼 | 완료 | 2024-12-15 | 2024-12-15 |

#### Sheet 2: 선택 영상 (Selected Videos)

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 프로젝트ID | 영상ID | 제목 | 채널명 | 구독자 | 조회수 | 좋아요 | 댓글수 | 영상길이 | 터짐지수 | 등급 | 영상URL |
| 1 | abc123 | 다이어트 성공비결 | 헬스채널 | 125,000 | 1,912,500 | 45,230 | 3,421 | 8:32 | 15.3 | S | https://... |

#### Sheet 3: 댓글 분석 (Comment Analysis)

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| 영상ID | 분석댓글수 | 긍정수 | 부정수 | 긍정비율 | 긍정요약 | 긍정키워드 | 부정요약 | 개선제안 |
| abc123 | 200 | 144 | 56 | 72% | 설명이 명확... | 유익함,감사 | 초보자에게... | 단계별 설명... |

#### Sheet 4: 생성 대본 (Generated Scripts)

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| 영상ID | 대본목적 | 타겟 | 예상길이 | 포맷 | 글자수 | 훅 | 전체대본 |
| abc123 | 초보자 설명 부족 해결 | 다이어트 입문자 | 7:30 | 롱폼 | 2,450 | 다이어트를... | (전체 대본) |

#### Sheet 5: 생성 에셋 (Generated Assets)

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| 대본ID | 에셋타입 | 파일명 | 파일경로 | 파일크기 | 다운로드URL | 해상도/길이 | 상태 | 생성일 |
| 1 | 이미지 | diet_img_01.png | /assets/... | 2.5MB | https://... | 1920×1080 | 완료 | 2024-12-15 |
| 1 | 음성 | diet_voice.mp3 | /assets/... | 12MB | https://... | 7:32 | 완료 | 2024-12-15 |
| 1 | 자막 | diet_subtitle.srt | /assets/... | 15KB | https://... | 156라인 | 완료 | 2024-12-15 |
| 1 | 영상 | diet_final.mp4 | /assets/... | 245MB | https://... | 1920×1080, 7:32 | 완료 | 2024-12-15 |

#### Sheet 6: 업로드 이력 (Upload History)

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| 에셋ID | YouTube영상ID | 업로드제목 | 태그 | 공개상태 | 예약일시 | 실제공개일 | 상태 | 썸네일URL |
| 4 | xyz789 | 다이어트 완전 초보 가이드 | 다이어트,건강 | 공개 | - | 2024-12-15 15:00 | 게시완료 | https://... |

#### Sheet 7: 전체 리포트 (Full Reports)

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| 프로젝트ID | 영상ID | 리포트타입 | 파일명 | 파일경로 | 파일크기 | 생성일 |
| 1 | abc123 | 전체리포트 | 다이어트_전체리포트.md | /reports/... | 45KB | 2024-12-15 |

### Node.js Google Sheets 연동 코드

```javascript
const { google } = require('googleapis');
const path = require('path');

// 서비스 계정 인증
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'service-account-key.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// 시트 이름 상수
const SHEETS = {
  PROJECTS: '프로젝트목록',
  VIDEOS: '선택영상',
  COMMENTS: '댓글분석',
  SCRIPTS: '생성대본',
  ASSETS: '생성에셋',
  UPLOADS: '업로드이력',
  REPORTS: '전체리포트'
};

// 데이터 행 추가
async function appendRow(sheetName, values) {
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [values]
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error appending to ${sheetName}:`, error);
    throw error;
  }
}

// 프로젝트 추가
async function addProject(project) {
  const values = [
    project.id,
    project.name,
    project.keyword,
    project.format === 'short' ? '숏폼' : '롱폼',
    project.status,
    project.createdAt,
    project.updatedAt
  ];
  return await appendRow(SHEETS.PROJECTS, values);
}

// 선택 영상 추가
async function addSelectedVideo(video) {
  const values = [
    video.projectId,
    video.videoId,
    video.title,
    video.channelName,
    video.subscriberCount.toLocaleString(),
    video.viewCount.toLocaleString(),
    video.likeCount.toLocaleString(),
    video.commentCount.toLocaleString(),
    formatDuration(video.durationSeconds),
    video.viralScore.toFixed(2),
    video.viralGrade,
    `https://youtube.com/watch?v=${video.videoId}`
  ];
  return await appendRow(SHEETS.VIDEOS, values);
}

// 댓글 분석 추가
async function addCommentAnalysis(analysis) {
  const values = [
    analysis.videoId,
    analysis.totalComments,
    analysis.positiveCount,
    analysis.negativeCount,
    `${analysis.positiveRatio}%`,
    analysis.positiveSummary,
    analysis.positiveKeywords.join(', '),
    analysis.negativeSummary,
    analysis.improvementSuggestions
  ];
  return await appendRow(SHEETS.COMMENTS, values);
}

// 생성 대본 추가
async function addGeneratedScript(script) {
  const values = [
    script.videoId,
    script.purpose,
    script.targetAudience,
    formatDuration(script.expectedDuration),
    script.format === 'short' ? '숏폼' : '롱폼',
    script.wordCount.toLocaleString(),
    script.hook?.substring(0, 100) + '...',
    script.fullScript
  ];
  return await appendRow(SHEETS.SCRIPTS, values);
}

// 생성 에셋 추가
async function addGeneratedAsset(asset) {
  let sizeDisplay = '';
  if (asset.fileSize < 1024 * 1024) {
    sizeDisplay = `${(asset.fileSize / 1024).toFixed(1)}KB`;
  } else {
    sizeDisplay = `${(asset.fileSize / (1024 * 1024)).toFixed(1)}MB`;
  }

  const typeLabels = {
    image: '이미지',
    voice: '음성',
    subtitle: '자막',
    video: '영상',
    report: '리포트'
  };

  let dimensionDisplay = '';
  if (asset.type === 'image') {
    dimensionDisplay = asset.resolution;
  } else if (asset.type === 'voice' || asset.type === 'video') {
    dimensionDisplay = formatDuration(asset.duration);
    if (asset.type === 'video') {
      dimensionDisplay = `${asset.resolution}, ${dimensionDisplay}`;
    }
  } else if (asset.type === 'subtitle') {
    dimensionDisplay = `${asset.lineCount}라인`;
  }

  const values = [
    asset.scriptId,
    typeLabels[asset.type] || asset.type,
    asset.fileName,
    asset.filePath,
    sizeDisplay,
    asset.fileUrl || '',
    dimensionDisplay,
    asset.status === 'completed' ? '완료' : asset.status,
    asset.createdAt
  ];
  return await appendRow(SHEETS.ASSETS, values);
}

// 업로드 이력 추가
async function addUploadHistory(upload) {
  const statusLabels = {
    pending: '대기중',
    uploading: '업로드중',
    processing: '처리중',
    published: '게시완료',
    failed: '실패'
  };

  const privacyLabels = {
    public: '공개',
    unlisted: '일부공개',
    private: '비공개'
  };

  const values = [
    upload.assetId,
    upload.youtubeVideoId || '',
    upload.title,
    upload.tags.join(', '),
    privacyLabels[upload.privacyStatus] || upload.privacyStatus,
    upload.scheduledAt || '-',
    upload.publishedAt || '-',
    statusLabels[upload.status] || upload.status,
    upload.thumbnailUrl || ''
  ];
  return await appendRow(SHEETS.UPLOADS, values);
}

// 전체 리포트 추가
async function addFullReport(report) {
  const typeLabels = {
    comments: '댓글분석',
    script: '대본',
    assets: '에셋목록',
    full: '전체리포트'
  };

  const values = [
    report.projectId,
    report.videoId,
    typeLabels[report.type] || report.type,
    report.fileName,
    report.filePath,
    `${(report.fileSize / 1024).toFixed(1)}KB`,
    report.generatedAt
  ];
  return await appendRow(SHEETS.REPORTS, values);
}

// 특정 셀 업데이트
async function updateCell(sheetName, cell, value) {
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${cell}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[value]]
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating cell ${cell} in ${sheetName}:`, error);
    throw error;
  }
}

// 시트 전체 데이터 조회
async function getSheetData(sheetName) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Error reading ${sheetName}:`, error);
    throw error;
  }
}

// 시간 포맷 헬퍼
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// 일괄 동기화 (DB → Sheets)
async function syncProjectToSheets(projectId, dbData) {
  // 프로젝트 정보
  await addProject(dbData.project);
  
  // 선택 영상들
  for (const video of dbData.videos) {
    await addSelectedVideo(video);
    
    // 댓글 분석
    if (video.commentAnalysis) {
      await addCommentAnalysis(video.commentAnalysis);
    }
    
    // 생성 대본
    if (video.script) {
      await addGeneratedScript(video.script);
      
      // 생성 에셋들
      for (const asset of video.script.assets || []) {
        await addGeneratedAsset(asset);
        
        // 업로드 이력
        if (asset.upload) {
          await addUploadHistory(asset.upload);
        }
      }
    }
  }
  
  // 전체 리포트들
  for (const report of dbData.reports || []) {
    await addFullReport(report);
  }
  
  console.log(`Project ${projectId} synced to Google Sheets`);
}

module.exports = {
  addProject,
  addSelectedVideo,
  addCommentAnalysis,
  addGeneratedScript,
  addGeneratedAsset,
  addUploadHistory,
  addFullReport,
  updateCell,
  getSheetData,
  syncProjectToSheets,
  SHEETS
};
```

### Google Sheets 템플릿 초기화 스크립트

```javascript
async function initializeSpreadsheet() {
  // 헤더 행 정의
  const headers = {
    [SHEETS.PROJECTS]: [
      '프로젝트ID', '프로젝트명', '키워드', '포맷', '상태', '생성일', '수정일'
    ],
    [SHEETS.VIDEOS]: [
      '프로젝트ID', '영상ID', '제목', '채널명', '구독자', '조회수', 
      '좋아요', '댓글수', '영상길이', '터짐지수', '등급', '영상URL'
    ],
    [SHEETS.COMMENTS]: [
      '영상ID', '분석댓글수', '긍정수', '부정수', '긍정비율', 
      '긍정요약', '긍정키워드', '부정요약', '개선제안'
    ],
    [SHEETS.SCRIPTS]: [
      '영상ID', '대본목적', '타겟', '예상길이', '포맷', '글자수', '훅', '전체대본'
    ],
    [SHEETS.ASSETS]: [
      '대본ID', '에셋타입', '파일명', '파일경로', '파일크기', 
      '다운로드URL', '해상도/길이', '상태', '생성일'
    ],
    [SHEETS.UPLOADS]: [
      '에셋ID', 'YouTube영상ID', '업로드제목', '태그', '공개상태',
      '예약일시', '실제공개일', '상태', '썸네일URL'
    ],
    [SHEETS.REPORTS]: [
      '프로젝트ID', '영상ID', '리포트타입', '파일명', '파일경로', '파일크기', '생성일'
    ]
  };

  // 각 시트에 헤더 추가
  for (const [sheetName, headerRow] of Object.entries(headers)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [headerRow]
      }
    });
    console.log(`Headers initialized for ${sheetName}`);
  }
}
```

### 자동 동기화 트리거

```javascript
// 데이터 저장 시 자동으로 DB와 Sheets 동시 저장
class DataSyncService {
  constructor(dbPool, sheetsClient) {
    this.db = dbPool;
    this.sheets = sheetsClient;
  }

  async saveCommentAnalysis(videoId, analysisData) {
    // 1. MariaDB 저장
    const dbResult = await saveCommentAnalysisToDb(this.db, videoId, analysisData);
    
    // 2. Google Sheets 저장
    await this.sheets.addCommentAnalysis({
      ...analysisData,
      videoId: videoId
    });
    
    return dbResult;
  }

  async saveGeneratedAsset(scriptId, assetData) {
    // 1. MariaDB 저장
    const dbResult = await saveGeneratedAssetToDb(this.db, scriptId, assetData);
    
    // 2. Google Sheets 저장
    await this.sheets.addGeneratedAsset({
      ...assetData,
      scriptId: scriptId
    });
    
    return dbResult;
  }

  // ... 다른 메서드들
}
```

---

## 전체 데이터 흐름 아키텍처 (업데이트)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    📺 YouTube 콘텐츠 자동화 워크플로우 v6.0                    │
└─────────────────────────────────────────────────────────────────────────────┘

[포맷 선택: 숏폼/롱폼(기본)]
     ↓
[키워드 입력]
     ↓
[YouTube API] → 검색 → 터짐 지수 계산 → 테이블 UI
     ↓
     ├──────────────────────────────────────────┐
     ↓                                          ↓
[영상 선택] ─────────────────────────────→ [MariaDB: selected_videos]
     ↓                                          ↓
     ↓                                    [Google Sheets: 선택영상]
     ↓
┌────────────────────────────────────────────────────────────────┐
│  4단계: 댓글 분석 + 채팅 연결                                    │
├────────────────────────────────────────────────────────────────┤
│  [댓글 수집] → [Gemini 3 Pro 분석]                              │
│       ↓                                                        │
│  ┌─────────────────────────────────────────────┐               │
│  │  📊 분석 결과 표시                           │               │
│  │  긍정/부정 요약, 키워드, 개선제안             │               │
│  │                    [복사] [대본생성에 적용]   │               │
│  └─────────────────────────────────────────────┘               │
│       ↓                                                        │
│  ┌─────────────────────────────────────────────┐               │
│  │  💬 대본 생성 채팅창                         │               │
│  │  - 분석 결과 자동 연결                       │               │
│  │  - 캐릭터 설정 대화                          │               │
│  │  - 대본 방향 논의                            │               │
│  │  [입력창...]                        [전송]   │               │
│  └─────────────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────┘
     ↓
     ├── [📥 댓글분석.md 다운로드] ───────→ [MariaDB: comment_analysis]
     ↓                                          ↓
     ↓                                    [Google Sheets: 댓글분석]
     ↓
┌────────────────────────────────────────────────────────────────┐
│  5단계: 캐릭터 설정 + 대본 생성                                  │
├────────────────────────────────────────────────────────────────┤
│  🎭 등장인물 설정 (5명)                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                      │
│  │ ⭐  │ │ 👤  │ │ 👤  │ │ 👤  │ │ 👤  │                      │
│  │주인공│ │조연1│ │조연2│ │조연3│ │조연4│                      │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                      │
│  - 이름, 역할, 외모, 성격, 말투 설정                            │
│                                                                │
│  📝 장면별 대본 생성                                            │
│  Scene 1 → Scene 2 → Scene 3 → Scene 4 → Scene 5              │
└────────────────────────────────────────────────────────────────┘
     ↓
     ├── [📥 대본.md 다운로드] ───────────→ [MariaDB: generated_scripts]
     ↓                                          ↓
     ├── [캐릭터 정보] ───────────────────→ [MariaDB: script_characters]
     ↓                                    [Google Sheets: 생성대본]
     ↓
┌────────────────────────────────────────────────────────────────┐
│  6단계: 캐릭터 + 장면 이미지 생성                                │
├────────────────────────────────────────────────────────────────┤
│  🖼️ Gemini 3 Pro Image 사용                                    │
│                                                                │
│  Step 1: 캐릭터 이미지 (5장)                                    │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                      │
│  │ ⭐  │ │ 👤  │ │ 👤  │ │ 👤  │ │ 👤  │                      │
│  │ ✅  │ │ ✅  │ │ ⏳  │ │ ⬜  │ │ ⬜  │                      │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                      │
│                                                                │
│  Step 2: 장면 이미지 (5장)                                      │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐            │
│  │Scene1 │ │Scene2 │ │Scene3 │ │Scene4 │ │Scene5 │            │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘            │
│                                                                │
│  Step 3: 썸네일 (1장)                                          │
└────────────────────────────────────────────────────────────────┘
     ↓
     ├── [📥 이미지 파일 다운로드] ───────→ [MariaDB: generated_assets]
     ↓                                          ↓
     ↓                                    [Google Sheets: 생성에셋]
     ↓
[음성/자막 생성 (ElevenLabs TTS)] ───────→ [MariaDB: generated_assets]
     ↓                                          ↓
     ├── [📥 음성/자막 파일 다운로드]     [Google Sheets: 생성에셋]
     ↓
┌────────────────────────────────────────────────────────────────┐
│  7단계: 영상 합성 (FFmpeg/Remotion)                             │
├────────────────────────────────────────────────────────────────┤
│  캐릭터 이미지 + 장면 이미지 + 음성 + 자막 → 최종 영상           │
│                                                                │
│  ┌──────────────────────────────────────────────────┐          │
│  │  🎬 영상 미리보기                                │          │
│  │  ┌────────────────────────────────────┐         │          │
│  │  │                                    │         │          │
│  │  │         [Scene 이미지]             │         │          │
│  │  │                                    │         │          │
│  │  │  ───────────────────────────────── │         │          │
│  │  │  자막: "오늘부터 같이 시작해볼까요?" │         │          │
│  │  └────────────────────────────────────┘         │          │
│  │  ▶ 0:45 / 1:00                    [전체화면]    │          │
│  └──────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────┘
     ↓
     ├── [📥 최종영상.mp4 다운로드] ──────→ [MariaDB: generated_assets]
     ↓                                          ↓
     ↓                                    [Google Sheets: 생성에셋]
     ↓
[전체 리포트 생성] ──────────────────────→ [MariaDB: full_reports]
     ↓                                          ↓
     ├── [📥 전체리포트.md 다운로드]      [Google Sheets: 전체리포트]
     ↓
[다중 플랫폼 업로드] ────────────────────→ [MariaDB: upload_history]
     ↓                                          ↓
     ├── YouTube Shorts/Long                    │
     ├── TikTok                           [Google Sheets: 업로드이력]
     └── Instagram Reels                        │
     ↓
[완료] → [성과 대시보드에서 추적]
```

### 핵심 워크플로우 요약

| 단계 | 기능 | 핵심 기술 |
|------|------|-----------|
| 1~3 | 영상 검색 & 선택 | YouTube Data API, 터짐 지수 |
| 4 | 댓글 분석 + 채팅 연결 | Gemini 3 Pro, 채팅 UI |
| 5 | 캐릭터(5명) + 대본 생성 | 채팅 기반 캐릭터 설정 |
| 6 | 캐릭터/장면 이미지 (11장) | Gemini 3 Pro Image |
| 7 | 영상 합성 | FFmpeg, TTS |
| 8+ | 업로드 & 분석 | 다중 플랫폼, A/B 테스트 |

---

## 파일 저장소 구조

```
/storage
├── /projects
│   └── /{project_id}
│       └── /{video_id}
│           ├── /characters          # 캐릭터 이미지 (5장)
│           │   ├── char_protagonist_김지영.png
│           │   ├── char_supporting_박영양.png
│           │   ├── char_supporting_이트레이너.png
│           │   ├── char_supporting_최동료.png
│           │   └── char_supporting_정멘토.png
│           ├── /scenes              # 장면 이미지 (4~8장)
│           │   ├── scene_01_오프닝.png
│           │   ├── scene_02_사무실.png
│           │   ├── scene_03_상담실.png
│           │   ├── scene_04_성공사례.png
│           │   └── scene_05_마무리.png
│           ├── /thumbnails          # 썸네일 (1~3장)
│           │   └── thumbnail_main.png
│           ├── /audio
│           │   └── {title}_voice.mp3
│           ├── /subtitles
│           │   └── {title}_subtitle.srt
│           ├── /video
│           │   └── {title}_final.mp4
│           └── /reports
│               ├── {title}_댓글분석.md
│               ├── {title}_대본.md
│               ├── {title}_캐릭터.md
│               ├── {title}_에셋목록.md
│               └── {title}_전체리포트.md
└── /temp
    └── (임시 작업 파일)
```

---

## 12단계: 다중 플랫폼 지원 (TikTok, Instagram Reels)

YouTube 외에 TikTok, Instagram Reels 등 다른 플랫폼에도 자동 업로드를 지원합니다.

### 플랫폼별 사양 비교

| 구분 | YouTube Shorts | TikTok | Instagram Reels |
|------|----------------|--------|-----------------|
| 최대 길이 | 60초 | 10분 | 90초 |
| 권장 길이 | 15~60초 | 15~60초 | 15~30초 |
| 해상도 | 1080×1920 | 1080×1920 | 1080×1920 |
| 비율 | 9:16 | 9:16 | 9:16 |
| 최대 파일 크기 | 2GB | 287MB (웹) | 4GB |
| 해시태그 | #Shorts 필수 | 최대 100개 | 최대 30개 |

### 플랫폼 테이블 (platforms)

```sql
CREATE TABLE platforms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform_code VARCHAR(20) NOT NULL UNIQUE,
    platform_name VARCHAR(50) NOT NULL,
    max_duration_seconds INT,
    max_file_size_mb INT,
    aspect_ratio VARCHAR(10),
    resolution VARCHAR(20),
    api_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platforms (platform_code, platform_name, max_duration_seconds, max_file_size_mb, aspect_ratio, resolution, api_enabled) VALUES
('youtube_shorts', 'YouTube Shorts', 60, 2048, '9:16', '1080x1920', TRUE),
('youtube_long', 'YouTube', 43200, 256000, '16:9', '1920x1080', TRUE),
('tiktok', 'TikTok', 600, 287, '9:16', '1080x1920', TRUE),
('instagram_reels', 'Instagram Reels', 90, 4096, '9:16', '1080x1920', TRUE);
```

### 다중 플랫폼 업로드 테이블 (multi_platform_uploads)

```sql
CREATE TABLE multi_platform_uploads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    asset_id BIGINT NOT NULL,
    platform_id INT NOT NULL,
    platform_video_id VARCHAR(100),
    platform_url VARCHAR(500),
    upload_title VARCHAR(200),
    upload_description TEXT,
    hashtags JSON,
    optimized_file_path VARCHAR(500),
    upload_status ENUM('pending', 'optimizing', 'uploading', 'published', 'failed') DEFAULT 'pending',
    scheduled_at DATETIME,
    published_at DATETIME,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (asset_id) REFERENCES generated_assets(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES platforms(id),
    UNIQUE KEY uk_asset_platform (asset_id, platform_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 통합 업로드 서비스

```javascript
class MultiPlatformUploadService {
  constructor(db) {
    this.db = db;
  }

  async uploadToAllPlatforms(assetId, platforms, options = {}) {
    const results = [];
    
    for (const platformCode of platforms) {
      try {
        // 플랫폼별 최적화 (FFmpeg)
        const optimizedPath = await this.optimizeForPlatform(assetId, platformCode);
        
        // 플랫폼별 업로드
        let result;
        switch (platformCode) {
          case 'tiktok':
            result = await this.uploadToTikTok(optimizedPath, options);
            break;
          case 'instagram_reels':
            result = await this.uploadToInstagram(optimizedPath, options);
            break;
          default:
            result = await this.uploadToYouTube(optimizedPath, options);
        }
        
        await this.saveUploadResult(assetId, platformCode, result);
        results.push({ platform: platformCode, success: true, result });
      } catch (error) {
        results.push({ platform: platformCode, success: false, error: error.message });
      }
    }
    
    return results;
  }

  async optimizeForPlatform(assetId, platformCode) {
    const platform = await this.getPlatformSettings(platformCode);
    const asset = await this.getAsset(assetId);
    const outputPath = `/tmp/${asset.file_name}_${platformCode}.mp4`;
    
    await execPromise(`ffmpeg -i ${asset.file_path} \
      -vf "scale=${platform.resolution.replace('x', ':')}" \
      -t ${platform.max_duration_seconds} \
      -fs ${platform.max_file_size_mb}M \
      -c:v libx264 -preset fast -crf 23 \
      -c:a aac -b:a 128k ${outputPath}`);
    
    return outputPath;
  }
}
```

### Google Sheets: 다중 플랫폼 업로드 시트

| 에셋ID | 플랫폼 | 플랫폼영상ID | URL | 제목 | 해시태그 | 게시일 | 상태 | 조회수 |
|--------|--------|--------------|-----|------|----------|--------|------|--------|
| 4 | YouTube Shorts | abc123 | https://... | 다이어트 팁 | #다이어트 | 2024-12-15 | 게시완료 | 15,230 |
| 4 | TikTok | xyz789 | https://... | 다이어트 팁 | #다이어트 | 2024-12-15 | 게시완료 | 45,120 |

---

## 13단계: A/B 테스트 시스템

동일 콘텐츠에 대해 다양한 썸네일, 제목 조합을 테스트하여 최적의 성과를 도출합니다.

### A/B 테스트 테이블 (ab_tests)

```sql
CREATE TABLE ab_tests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    test_type ENUM('thumbnail', 'title', 'description', 'combined') NOT NULL,
    status ENUM('draft', 'running', 'completed', 'cancelled') DEFAULT 'draft',
    start_date DATETIME,
    end_date DATETIME,
    min_views_per_variant INT DEFAULT 1000,
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    winner_variant_id BIGINT,
    statistical_significance DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### A/B 테스트 변형 테이블 (ab_test_variants)

```sql
CREATE TABLE ab_test_variants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    test_id BIGINT NOT NULL,
    variant_name VARCHAR(50) NOT NULL,
    is_control BOOLEAN DEFAULT FALSE,
    title VARCHAR(200),
    description TEXT,
    thumbnail_path VARCHAR(500),
    youtube_video_id VARCHAR(20),
    
    -- 성과 지표
    views INT DEFAULT 0,
    watch_time_hours DECIMAL(10,2) DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    ctr DECIMAL(5,4) DEFAULT 0,
    avg_view_duration_seconds INT DEFAULT 0,
    engagement_score DECIMAL(10,4) DEFAULT 0,
    
    last_metrics_update DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### A/B 테스트 서비스

```javascript
class ABTestService {
  constructor(db, youtubeApi) {
    this.db = db;
    this.youtube = youtubeApi;
  }

  async createTest(projectId, testConfig) {
    const { testName, testType, variants } = testConfig;
    
    // 테스트 생성
    const [testResult] = await this.db.execute(
      `INSERT INTO ab_tests (project_id, test_name, test_type) VALUES (?, ?, ?)`,
      [projectId, testName, testType]
    );
    const testId = testResult.insertId;
    
    // 변형 생성 및 업로드
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const variantName = String.fromCharCode(65 + i); // A, B, C...
      
      // YouTube에 업로드
      const videoId = await this.youtube.uploadVideo({
        title: variant.title,
        description: variant.description,
        thumbnailPath: variant.thumbnailPath
      });
      
      await this.db.execute(
        `INSERT INTO ab_test_variants 
         (test_id, variant_name, is_control, title, description, thumbnail_path, youtube_video_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [testId, variantName, i === 0, variant.title, variant.description, 
         variant.thumbnailPath, videoId]
      );
    }
    
    return testId;
  }

  async updateMetrics(testId) {
    const [variants] = await this.db.execute(
      `SELECT * FROM ab_test_variants WHERE test_id = ?`, [testId]
    );
    
    for (const variant of variants) {
      const analytics = await this.youtube.getVideoAnalytics(variant.youtube_video_id);
      
      const engagementScore = this.calculateEngagementScore(analytics);
      
      await this.db.execute(
        `UPDATE ab_test_variants SET
         views = ?, watch_time_hours = ?, likes = ?, comments = ?,
         ctr = ?, avg_view_duration_seconds = ?, engagement_score = ?,
         last_metrics_update = NOW()
         WHERE id = ?`,
        [analytics.views, analytics.watchTimeHours, analytics.likes,
         analytics.comments, analytics.ctr, analytics.avgViewDuration,
         engagementScore, variant.id]
      );
    }
  }

  calculateEngagementScore(analytics) {
    // 가중 점수 계산
    return (
      analytics.ctr * 0.3 +
      (analytics.avgViewDuration / analytics.videoDuration) * 0.3 +
      (analytics.likes / analytics.views) * 0.2 +
      (analytics.comments / analytics.views) * 0.2
    ) * 100;
  }

  async determineWinner(testId) {
    const [variants] = await this.db.execute(
      `SELECT * FROM ab_test_variants WHERE test_id = ? ORDER BY engagement_score DESC`,
      [testId]
    );
    
    if (variants.length < 2) return null;
    
    const control = variants.find(v => v.is_control);
    const best = variants[0];
    
    // 통계적 유의성 검정 (간소화된 Z-test)
    const significance = this.calculateSignificance(control, best);
    
    if (significance >= 0.95) {
      await this.db.execute(
        `UPDATE ab_tests SET winner_variant_id = ?, statistical_significance = ?, 
         status = 'completed' WHERE id = ?`,
        [best.id, significance, testId]
      );
      return { winner: best, significance };
    }
    
    return { winner: null, significance, message: '아직 유의미한 차이 없음' };
  }
}
```

### Google Sheets: A/B 테스트 시트

| 테스트ID | 테스트명 | 유형 | 변형 | 제목 | 조회수 | CTR | 평균시청시간 | 참여점수 | 상태 |
|----------|----------|------|------|------|--------|-----|--------------|----------|------|
| 1 | 썸네일테스트 | thumbnail | A (대조군) | 다이어트 비법 | 5,230 | 4.2% | 3:45 | 72.5 | 진행중 |
| 1 | 썸네일테스트 | thumbnail | B | 다이어트 비법 | 6,120 | 5.1% | 4:12 | 81.3 | 진행중 |

---

## 14단계: 성과 대시보드

업로드된 영상의 성과를 실시간으로 추적하고 분석합니다.

### 성과 지표 테이블 (video_analytics)

```sql
CREATE TABLE video_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    upload_id BIGINT NOT NULL,
    metric_date DATE NOT NULL,
    
    -- 기본 지표
    views INT DEFAULT 0,
    watch_time_minutes DECIMAL(12,2) DEFAULT 0,
    avg_view_duration_seconds INT DEFAULT 0,
    avg_percentage_viewed DECIMAL(5,2) DEFAULT 0,
    
    -- 참여 지표
    likes INT DEFAULT 0,
    dislikes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    
    -- 구독 지표
    subscribers_gained INT DEFAULT 0,
    subscribers_lost INT DEFAULT 0,
    
    -- 노출 지표
    impressions INT DEFAULT 0,
    impressions_ctr DECIMAL(5,4) DEFAULT 0,
    
    -- 트래픽 소스
    traffic_source_search INT DEFAULT 0,
    traffic_source_suggested INT DEFAULT 0,
    traffic_source_browse INT DEFAULT 0,
    traffic_source_external INT DEFAULT 0,
    
    -- 수익 (수익화 채널용)
    estimated_revenue_usd DECIMAL(10,2) DEFAULT 0,
    cpm_usd DECIMAL(6,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (upload_id) REFERENCES upload_history(id) ON DELETE CASCADE,
    UNIQUE KEY uk_upload_date (upload_id, metric_date),
    INDEX idx_metric_date (metric_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 채널 전체 성과 테이블 (channel_analytics)

```sql
CREATE TABLE channel_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    channel_id VARCHAR(30) NOT NULL,
    metric_date DATE NOT NULL,
    
    total_views INT DEFAULT 0,
    total_watch_time_hours DECIMAL(12,2) DEFAULT 0,
    total_subscribers INT DEFAULT 0,
    subscribers_change INT DEFAULT 0,
    total_videos INT DEFAULT 0,
    estimated_revenue_usd DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_channel_date (channel_id, metric_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 대시보드 서비스

```javascript
class DashboardService {
  constructor(db, youtubeAnalytics) {
    this.db = db;
    this.analytics = youtubeAnalytics;
  }

  // 일별 성과 동기화 (크론 작업)
  async syncDailyMetrics() {
    const [uploads] = await this.db.execute(
      `SELECT id, youtube_video_id FROM upload_history 
       WHERE upload_status = 'published' 
       AND actual_published_at > DATE_SUB(NOW(), INTERVAL 90 DAY)`
    );
    
    for (const upload of uploads) {
      const metrics = await this.analytics.getVideoMetrics(
        upload.youtube_video_id,
        'today'
      );
      
      await this.db.execute(
        `INSERT INTO video_analytics 
         (upload_id, metric_date, views, watch_time_minutes, avg_view_duration_seconds,
          likes, comments, shares, impressions, impressions_ctr,
          subscribers_gained, subscribers_lost)
         VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         views = VALUES(views), watch_time_minutes = VALUES(watch_time_minutes)`,
        [upload.id, metrics.views, metrics.watchTime, metrics.avgDuration,
         metrics.likes, metrics.comments, metrics.shares, metrics.impressions,
         metrics.ctr, metrics.subsGained, metrics.subsLost]
      );
    }
  }

  // 대시보드 요약 데이터
  async getDashboardSummary(projectId, period = '7d') {
    const periodDays = parseInt(period) || 7;
    
    const [summary] = await this.db.execute(`
      SELECT 
        COUNT(DISTINCT uh.id) as total_videos,
        SUM(va.views) as total_views,
        SUM(va.watch_time_minutes) / 60 as total_watch_hours,
        AVG(va.avg_view_duration_seconds) as avg_duration,
        SUM(va.likes) as total_likes,
        SUM(va.comments) as total_comments,
        SUM(va.subscribers_gained) as total_subs_gained,
        AVG(va.impressions_ctr) * 100 as avg_ctr
      FROM upload_history uh
      JOIN generated_assets ga ON uh.asset_id = ga.id
      JOIN generated_scripts gs ON ga.script_id = gs.id
      JOIN selected_videos sv ON gs.video_id = sv.id
      JOIN projects p ON sv.project_id = p.id
      LEFT JOIN video_analytics va ON uh.id = va.upload_id
      WHERE p.id = ?
      AND va.metric_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `, [projectId, periodDays]);
    
    return summary[0];
  }

  // 일별 추이 데이터
  async getDailyTrend(projectId, days = 30) {
    const [trend] = await this.db.execute(`
      SELECT 
        va.metric_date,
        SUM(va.views) as views,
        SUM(va.watch_time_minutes) as watch_time,
        SUM(va.likes) as likes,
        SUM(va.subscribers_gained) as subs_gained
      FROM video_analytics va
      JOIN upload_history uh ON va.upload_id = uh.id
      JOIN generated_assets ga ON uh.asset_id = ga.id
      JOIN generated_scripts gs ON ga.script_id = gs.id
      JOIN selected_videos sv ON gs.video_id = sv.id
      WHERE sv.project_id = ?
      AND va.metric_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY va.metric_date
      ORDER BY va.metric_date
    `, [projectId, days]);
    
    return trend;
  }

  // 영상별 성과 순위
  async getVideoRanking(projectId, sortBy = 'views', limit = 10) {
    const [ranking] = await this.db.execute(`
      SELECT 
        uh.upload_title,
        uh.youtube_video_id,
        SUM(va.views) as total_views,
        SUM(va.watch_time_minutes) as total_watch_time,
        AVG(va.impressions_ctr) as avg_ctr,
        SUM(va.likes) as total_likes,
        sv.viral_grade as original_viral_grade
      FROM upload_history uh
      JOIN video_analytics va ON uh.id = va.upload_id
      JOIN generated_assets ga ON uh.asset_id = ga.id
      JOIN generated_scripts gs ON ga.script_id = gs.id
      JOIN selected_videos sv ON gs.video_id = sv.id
      WHERE sv.project_id = ?
      GROUP BY uh.id
      ORDER BY ${sortBy === 'ctr' ? 'avg_ctr' : 'total_' + sortBy} DESC
      LIMIT ?
    `, [projectId, limit]);
    
    return ranking;
  }
}
```

### Google Sheets: 성과 대시보드 시트

| 영상제목 | YouTube ID | 총조회수 | 총시청시간 | 평균CTR | 좋아요 | 댓글 | 구독증가 | 원본등급 |
|----------|------------|----------|------------|---------|--------|------|----------|----------|
| 다이어트 초보 가이드 | abc123 | 125,430 | 1,245h | 5.2% | 4,523 | 342 | 523 | S |
| 운동 루틴 | def456 | 45,230 | 423h | 3.8% | 1,234 | 89 | 145 | A |

---

## 15단계: 템플릿 시스템

반복적으로 사용할 수 있는 대본 구조, 이미지 프롬프트, 영상 스타일 템플릿을 관리합니다.

### 템플릿 테이블 (templates)

```sql
CREATE TABLE templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(200) NOT NULL,
    template_type ENUM('script', 'image_prompt', 'video_style', 'thumbnail') NOT NULL,
    category VARCHAR(100),
    content_format ENUM('short', 'long', 'both') DEFAULT 'both',
    
    -- 템플릿 내용
    template_content LONGTEXT NOT NULL,
    template_variables JSON, -- 치환 가능한 변수 목록
    
    -- 예시 및 설명
    description TEXT,
    example_output TEXT,
    preview_image_url VARCHAR(500),
    
    -- 사용 통계
    use_count INT DEFAULT 0,
    avg_performance_score DECIMAL(5,2),
    
    is_public BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_type_category (template_type, category),
    INDEX idx_use_count (use_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 템플릿 사용 이력 테이블 (template_usage)

```sql
CREATE TABLE template_usage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    script_id BIGINT,
    
    -- 적용된 변수 값
    applied_variables JSON,
    generated_content LONGTEXT,
    
    -- 성과 연동
    performance_score DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 기본 템플릿 데이터

```sql
-- 대본 템플릿 예시
INSERT INTO templates (template_name, template_type, category, content_format, template_content, template_variables, description) VALUES
(
  '문제해결형 롱폼 대본',
  'script',
  '교육/정보',
  'long',
  '## 도입부 (0:00 ~ 1:00)
{{HOOK_QUESTION}}
안녕하세요, 오늘은 {{TOPIC}}에 대해 이야기해보려고 합니다.
{{VIEWER_PAIN_POINT}}로 고민하고 계신 분들 많으시죠?

## 본론 1: 문제 분석 (1:00 ~ 3:00)
{{PROBLEM_ANALYSIS}}

## 본론 2: 해결책 제시 (3:00 ~ 6:00)
{{SOLUTION_STEPS}}

## 본론 3: 실제 사례 (6:00 ~ 8:00)
{{REAL_EXAMPLES}}

## 결론 (8:00 ~ 10:00)
{{SUMMARY}}
{{CALL_TO_ACTION}}',
  '["HOOK_QUESTION", "TOPIC", "VIEWER_PAIN_POINT", "PROBLEM_ANALYSIS", "SOLUTION_STEPS", "REAL_EXAMPLES", "SUMMARY", "CALL_TO_ACTION"]',
  '시청자의 문제를 분석하고 해결책을 제시하는 교육 콘텐츠용 대본 템플릿'
),
(
  '바이럴 숏폼 대본',
  'script',
  '엔터테인먼트',
  'short',
  '## 훅 (0~3초)
{{SHOCKING_HOOK}}

## 핵심 (3~45초)
{{MAIN_CONTENT}}

## 반전/CTA (45~60초)
{{TWIST_OR_CTA}}',
  '["SHOCKING_HOOK", "MAIN_CONTENT", "TWIST_OR_CTA"]',
  '시선을 사로잡는 훅으로 시작하는 숏폼 바이럴 콘텐츠용 템플릿'
);

-- 이미지 프롬프트 템플릿 예시
INSERT INTO templates (template_name, template_type, category, content_format, template_content, template_variables, description) VALUES
(
  '전문가 인물 이미지',
  'image_prompt',
  '인물',
  'both',
  'Professional Korean {{GENDER}} in {{AGE_RANGE}}, wearing {{OUTFIT}}, {{POSE}}, in a {{SETTING}}, {{LIGHTING}}, photorealistic, high resolution, 8k, --ar {{ASPECT_RATIO}}',
  '["GENDER", "AGE_RANGE", "OUTFIT", "POSE", "SETTING", "LIGHTING", "ASPECT_RATIO"]',
  '전문적인 분위기의 한국인 인물 이미지 생성용 프롬프트'
),
(
  '감성적 배경 이미지',
  'image_prompt',
  '배경',
  'both',
  'Cinematic {{SCENE_TYPE}} scene, {{MOOD}} atmosphere, {{COLOR_TONE}} color grading, {{TIME_OF_DAY}}, volumetric lighting, depth of field, ultra detailed, --ar {{ASPECT_RATIO}}',
  '["SCENE_TYPE", "MOOD", "COLOR_TONE", "TIME_OF_DAY", "ASPECT_RATIO"]',
  '감성적인 분위기의 배경 이미지 생성용 프롬프트'
);
```

### 템플릿 서비스

```javascript
class TemplateService {
  constructor(db) {
    this.db = db;
  }

  // 템플릿 검색
  async searchTemplates(type, category, format) {
    let query = `SELECT * FROM templates WHERE template_type = ?`;
    const params = [type];
    
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    
    if (format && format !== 'both') {
      query += ` AND (content_format = ? OR content_format = 'both')`;
      params.push(format);
    }
    
    query += ` ORDER BY use_count DESC`;
    
    const [templates] = await this.db.execute(query, params);
    return templates;
  }

  // 템플릿 적용
  async applyTemplate(templateId, variables, projectId) {
    const [templates] = await this.db.execute(
      `SELECT * FROM templates WHERE id = ?`, [templateId]
    );
    
    if (!templates.length) throw new Error('템플릿을 찾을 수 없습니다');
    
    const template = templates[0];
    let content = template.template_content;
    
    // 변수 치환
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    // 사용 기록 저장
    await this.db.execute(
      `INSERT INTO template_usage (template_id, project_id, applied_variables, generated_content)
       VALUES (?, ?, ?, ?)`,
      [templateId, projectId, JSON.stringify(variables), content]
    );
    
    // 사용 횟수 증가
    await this.db.execute(
      `UPDATE templates SET use_count = use_count + 1 WHERE id = ?`,
      [templateId]
    );
    
    return content;
  }

  // 성과 기반 템플릿 추천
  async getRecommendedTemplates(type, limit = 5) {
    const [templates] = await this.db.execute(`
      SELECT t.*, 
             AVG(tu.performance_score) as avg_score,
             COUNT(tu.id) as usage_count
      FROM templates t
      LEFT JOIN template_usage tu ON t.id = tu.template_id
      WHERE t.template_type = ?
      GROUP BY t.id
      HAVING avg_score IS NOT NULL
      ORDER BY avg_score DESC, usage_count DESC
      LIMIT ?
    `, [type, limit]);
    
    return templates;
  }
}
```

### Google Sheets: 템플릿 관리 시트

| 템플릿ID | 템플릿명 | 유형 | 카테고리 | 포맷 | 사용횟수 | 평균성과 | 생성일 |
|----------|----------|------|----------|------|----------|----------|--------|
| 1 | 문제해결형 롱폼 대본 | script | 교육/정보 | 롱폼 | 45 | 78.5 | 2024-12-01 |
| 2 | 바이럴 숏폼 대본 | script | 엔터테인먼트 | 숏폼 | 123 | 82.3 | 2024-12-01 |

---

## 16단계: 협업 기능 (검토 및 승인 워크플로우)

Google Sheets 기반으로 팀원 간 콘텐츠 검토 및 승인 프로세스를 관리합니다.

### 워크플로우 단계 테이블 (workflow_stages)

```sql
CREATE TABLE workflow_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stage_code VARCHAR(30) NOT NULL UNIQUE,
    stage_name VARCHAR(100) NOT NULL,
    stage_order INT NOT NULL,
    requires_approval BOOLEAN DEFAULT FALSE,
    auto_advance BOOLEAN DEFAULT FALSE,
    notification_template TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO workflow_stages (stage_code, stage_name, stage_order, requires_approval) VALUES
('draft', '초안 작성', 1, FALSE),
('script_review', '대본 검토', 2, TRUE),
('image_review', '이미지 검토', 3, TRUE),
('video_review', '영상 검토', 4, TRUE),
('final_approval', '최종 승인', 5, TRUE),
('scheduled', '업로드 예약', 6, FALSE),
('published', '게시 완료', 7, FALSE);
```

### 프로젝트 워크플로우 테이블 (project_workflows)

```sql
CREATE TABLE project_workflows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    current_stage_id INT NOT NULL,
    
    -- 담당자 정보
    creator_id VARCHAR(100),
    assignee_id VARCHAR(100),
    reviewer_id VARCHAR(100),
    approver_id VARCHAR(100),
    
    -- 기한
    due_date DATETIME,
    
    -- 상태
    status ENUM('in_progress', 'pending_review', 'approved', 'rejected', 'completed') DEFAULT 'in_progress',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (current_stage_id) REFERENCES workflow_stages(id),
    INDEX idx_status (status),
    INDEX idx_assignee (assignee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 검토/승인 이력 테이블 (workflow_reviews)

```sql
CREATE TABLE workflow_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workflow_id BIGINT NOT NULL,
    stage_id INT NOT NULL,
    reviewer_id VARCHAR(100) NOT NULL,
    reviewer_name VARCHAR(100),
    
    -- 검토 결과
    action ENUM('approve', 'reject', 'request_changes', 'comment') NOT NULL,
    comments TEXT,
    
    -- 변경 요청 상세
    change_requests JSON,
    
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (workflow_id) REFERENCES project_workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES workflow_stages(id),
    INDEX idx_workflow_stage (workflow_id, stage_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 팀 멤버 테이블 (team_members)

```sql
CREATE TABLE team_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL,
    role ENUM('admin', 'creator', 'reviewer', 'approver', 'viewer') DEFAULT 'viewer',
    
    -- 알림 설정
    notify_email BOOLEAN DEFAULT TRUE,
    notify_slack BOOLEAN DEFAULT FALSE,
    slack_user_id VARCHAR(50),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 협업 서비스

```javascript
class WorkflowService {
  constructor(db, notificationService) {
    this.db = db;
    this.notify = notificationService;
  }

  // 워크플로우 생성
  async createWorkflow(projectId, creatorId) {
    const [result] = await this.db.execute(
      `INSERT INTO project_workflows (project_id, current_stage_id, creator_id, assignee_id, status)
       VALUES (?, 1, ?, ?, 'in_progress')`,
      [projectId, creatorId, creatorId]
    );
    
    return result.insertId;
  }

  // 검토 요청
  async requestReview(workflowId, reviewerId) {
    const workflow = await this.getWorkflow(workflowId);
    
    await this.db.execute(
      `UPDATE project_workflows SET reviewer_id = ?, status = 'pending_review' WHERE id = ?`,
      [reviewerId, workflowId]
    );
    
    // 알림 발송
    await this.notify.sendReviewRequest(reviewerId, workflow);
    
    return { success: true, message: '검토 요청이 전송되었습니다' };
  }

  // 검토/승인 처리
  async processReview(workflowId, reviewerId, action, comments, changeRequests = null) {
    const workflow = await this.getWorkflow(workflowId);
    
    // 검토 이력 저장
    await this.db.execute(
      `INSERT INTO workflow_reviews (workflow_id, stage_id, reviewer_id, action, comments, change_requests)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [workflowId, workflow.current_stage_id, reviewerId, action, 
       comments, changeRequests ? JSON.stringify(changeRequests) : null]
    );
    
    if (action === 'approve') {
      // 다음 단계로 진행
      await this.advanceToNextStage(workflowId);
      await this.notify.sendApprovalNotification(workflow.creator_id, workflow);
    } else if (action === 'reject' || action === 'request_changes') {
      // 수정 요청
      await this.db.execute(
        `UPDATE project_workflows SET status = 'rejected' WHERE id = ?`,
        [workflowId]
      );
      await this.notify.sendRejectionNotification(workflow.creator_id, workflow, comments, changeRequests);
    }
    
    return { success: true };
  }

  // 다음 단계로 진행
  async advanceToNextStage(workflowId) {
    const workflow = await this.getWorkflow(workflowId);
    
    const [nextStage] = await this.db.execute(
      `SELECT * FROM workflow_stages WHERE stage_order = ? + 1`,
      [workflow.stage_order]
    );
    
    if (nextStage.length > 0) {
      await this.db.execute(
        `UPDATE project_workflows SET current_stage_id = ?, status = 'in_progress' WHERE id = ?`,
        [nextStage[0].id, workflowId]
      );
    } else {
      // 마지막 단계 - 완료 처리
      await this.db.execute(
        `UPDATE project_workflows SET status = 'completed' WHERE id = ?`,
        [workflowId]
      );
    }
  }

  // 대시보드용 워크플로우 현황
  async getWorkflowDashboard(userId) {
    // 내가 검토해야 할 항목
    const [pendingReviews] = await this.db.execute(`
      SELECT pw.*, p.project_name, ws.stage_name
      FROM project_workflows pw
      JOIN projects p ON pw.project_id = p.id
      JOIN workflow_stages ws ON pw.current_stage_id = ws.id
      WHERE pw.reviewer_id = ? AND pw.status = 'pending_review'
      ORDER BY pw.updated_at DESC
    `, [userId]);
    
    // 내가 진행 중인 항목
    const [myProjects] = await this.db.execute(`
      SELECT pw.*, p.project_name, ws.stage_name
      FROM project_workflows pw
      JOIN projects p ON pw.project_id = p.id
      JOIN workflow_stages ws ON pw.current_stage_id = ws.id
      WHERE pw.creator_id = ? AND pw.status IN ('in_progress', 'rejected')
      ORDER BY pw.updated_at DESC
    `, [userId]);
    
    return { pendingReviews, myProjects };
  }
}
```

### Google Sheets: 협업 워크플로우 시트

| 프로젝트ID | 프로젝트명 | 현재단계 | 담당자 | 검토자 | 상태 | 기한 | 최근코멘트 |
|------------|------------|----------|--------|--------|------|------|------------|
| 1 | 다이어트 시리즈 | 영상 검토 | 김작가 | 이PD | 검토대기 | 2024-12-20 | 인트로 수정 필요 |
| 2 | 운동 루틴 | 대본 검토 | 박작가 | 최팀장 | 승인완료 | 2024-12-18 | LGTM! |

### Google Sheets: 검토 이력 시트

| 워크플로우ID | 단계 | 검토자 | 액션 | 코멘트 | 변경요청 | 검토일시 |
|--------------|------|--------|------|--------|----------|----------|
| 1 | 대본 검토 | 이PD | 수정요청 | 훅이 약함 | ["훅 강화", "CTA 명확화"] | 2024-12-15 10:30 |
| 1 | 대본 검토 | 이PD | 승인 | 수정 잘됨 | - | 2024-12-15 14:20 |

---

## 17단계: 백업 자동화

MariaDB 데이터를 Google Cloud Storage에 정기적으로 백업합니다.

### 백업 설정 테이블 (backup_configs)

```sql
CREATE TABLE backup_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backup_name VARCHAR(100) NOT NULL,
    backup_type ENUM('full', 'incremental', 'differential') DEFAULT 'full',
    schedule_cron VARCHAR(50) NOT NULL, -- '0 2 * * *' (매일 2시)
    retention_days INT DEFAULT 30,
    
    -- GCS 설정
    gcs_bucket VARCHAR(100) NOT NULL,
    gcs_path_prefix VARCHAR(200),
    
    -- 압축/암호화
    compression ENUM('none', 'gzip', 'zstd') DEFAULT 'gzip',
    encryption_enabled BOOLEAN DEFAULT TRUE,
    
    is_active BOOLEAN DEFAULT TRUE,
    last_backup_at DATETIME,
    last_backup_status ENUM('success', 'failed'),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 백업 이력 테이블 (backup_history)

```sql
CREATE TABLE backup_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL,
    backup_type ENUM('full', 'incremental', 'differential'),
    
    -- 파일 정보
    file_name VARCHAR(300),
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    gcs_url VARCHAR(500),
    
    -- 실행 정보
    started_at DATETIME,
    completed_at DATETIME,
    duration_seconds INT,
    
    -- 상태
    status ENUM('running', 'success', 'failed') DEFAULT 'running',
    error_message TEXT,
    
    -- 복원 테스트
    restore_tested BOOLEAN DEFAULT FALSE,
    restore_test_date DATETIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (config_id) REFERENCES backup_configs(id),
    INDEX idx_config_status (config_id, status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 백업 서비스

```javascript
const { Storage } = require('@google-cloud/storage');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

class BackupService {
  constructor(db, config) {
    this.db = db;
    this.storage = new Storage({ keyFilename: config.gcsKeyFile });
    this.config = config;
  }

  // 전체 백업 실행
  async runFullBackup(configId) {
    const [configs] = await this.db.execute(
      `SELECT * FROM backup_configs WHERE id = ?`, [configId]
    );
    const backupConfig = configs[0];
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_full_${timestamp}.sql`;
    const localPath = `/tmp/${fileName}`;
    
    // 백업 이력 생성
    const [historyResult] = await this.db.execute(
      `INSERT INTO backup_history (config_id, backup_type, file_name, started_at, status)
       VALUES (?, 'full', ?, NOW(), 'running')`,
      [configId, fileName]
    );
    const historyId = historyResult.insertId;
    
    try {
      // mysqldump 실행
      await execPromise(`mysqldump -h ${this.config.dbHost} -u ${this.config.dbUser} \
        -p${this.config.dbPassword} ${this.config.dbName} \
        --single-transaction --routines --triggers > ${localPath}`);
      
      // 압축
      let finalPath = localPath;
      if (backupConfig.compression === 'gzip') {
        await execPromise(`gzip ${localPath}`);
        finalPath = `${localPath}.gz`;
      }
      
      // 파일 크기 확인
      const stats = await fs.stat(finalPath);
      
      // GCS 업로드
      const gcsPath = `${backupConfig.gcs_path_prefix}/${path.basename(finalPath)}`;
      await this.storage
        .bucket(backupConfig.gcs_bucket)
        .upload(finalPath, { destination: gcsPath });
      
      const gcsUrl = `gs://${backupConfig.gcs_bucket}/${gcsPath}`;
      
      // 이력 업데이트 (성공)
      await this.db.execute(
        `UPDATE backup_history SET 
         file_path = ?, file_size_bytes = ?, gcs_url = ?,
         completed_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
         status = 'success'
         WHERE id = ?`,
        [gcsPath, stats.size, gcsUrl, historyId]
      );
      
      // 설정 테이블 업데이트
      await this.db.execute(
        `UPDATE backup_configs SET last_backup_at = NOW(), last_backup_status = 'success' WHERE id = ?`,
        [configId]
      );
      
      // 로컬 파일 삭제
      await fs.unlink(finalPath);
      
      // 오래된 백업 정리
      await this.cleanupOldBackups(configId, backupConfig.retention_days);
      
      return { success: true, gcsUrl, fileSize: stats.size };
      
    } catch (error) {
      // 이력 업데이트 (실패)
      await this.db.execute(
        `UPDATE backup_history SET status = 'failed', error_message = ?, completed_at = NOW() WHERE id = ?`,
        [error.message, historyId]
      );
      
      await this.db.execute(
        `UPDATE backup_configs SET last_backup_status = 'failed' WHERE id = ?`,
        [configId]
      );
      
      throw error;
    }
  }

  // 오래된 백업 정리
  async cleanupOldBackups(configId, retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const [oldBackups] = await this.db.execute(
      `SELECT * FROM backup_history 
       WHERE config_id = ? AND status = 'success' AND created_at < ?`,
      [configId, cutoffDate]
    );
    
    for (const backup of oldBackups) {
      try {
        // GCS에서 삭제
        const bucket = this.storage.bucket(backup.gcs_url.split('/')[2]);
        const filePath = backup.gcs_url.split('/').slice(3).join('/');
        await bucket.file(filePath).delete();
        
        // DB에서 삭제
        await this.db.execute(`DELETE FROM backup_history WHERE id = ?`, [backup.id]);
      } catch (error) {
        console.error(`Failed to delete old backup ${backup.id}:`, error);
      }
    }
  }

  // 백업에서 복원
  async restoreFromBackup(historyId, targetDatabase) {
    const [backups] = await this.db.execute(
      `SELECT * FROM backup_history WHERE id = ?`, [historyId]
    );
    const backup = backups[0];
    
    // GCS에서 다운로드
    const localPath = `/tmp/restore_${Date.now()}.sql.gz`;
    const bucket = this.storage.bucket(backup.gcs_url.split('/')[2]);
    const filePath = backup.gcs_url.split('/').slice(3).join('/');
    
    await bucket.file(filePath).download({ destination: localPath });
    
    // 압축 해제
    await execPromise(`gunzip ${localPath}`);
    const sqlPath = localPath.replace('.gz', '');
    
    // 복원 실행
    await execPromise(`mysql -h ${this.config.dbHost} -u ${this.config.dbUser} \
      -p${this.config.dbPassword} ${targetDatabase} < ${sqlPath}`);
    
    // 정리
    await fs.unlink(sqlPath);
    
    return { success: true, restoredFrom: backup.gcs_url };
  }

  // 백업 상태 대시보드
  async getBackupDashboard() {
    const [configs] = await this.db.execute(`
      SELECT bc.*, 
             COUNT(bh.id) as total_backups,
             SUM(bh.file_size_bytes) as total_size_bytes,
             MAX(bh.created_at) as latest_backup
      FROM backup_configs bc
      LEFT JOIN backup_history bh ON bc.id = bh.config_id AND bh.status = 'success'
      GROUP BY bc.id
    `);
    
    const [recentBackups] = await this.db.execute(`
      SELECT * FROM backup_history 
      ORDER BY created_at DESC LIMIT 10
    `);
    
    return { configs, recentBackups };
  }
}

// 크론 작업 설정
const cron = require('node-cron');

function setupBackupCron(backupService, db) {
  // 매일 새벽 2시 전체 백업
  cron.schedule('0 2 * * *', async () => {
    const [activeConfigs] = await db.execute(
      `SELECT id FROM backup_configs WHERE is_active = TRUE`
    );
    
    for (const config of activeConfigs) {
      try {
        await backupService.runFullBackup(config.id);
        console.log(`Backup ${config.id} completed successfully`);
      } catch (error) {
        console.error(`Backup ${config.id} failed:`, error);
      }
    }
  });
}
```

### Google Sheets: 백업 현황 시트

| 백업설정 | 유형 | 스케줄 | 최근백업 | 상태 | 보관기간 | 총백업수 | 총용량 |
|----------|------|--------|----------|------|----------|----------|--------|
| 일일 전체백업 | full | 매일 02:00 | 2024-12-15 02:00 | 성공 | 30일 | 30 | 2.5GB |
| 주간 전체백업 | full | 매주 일 03:00 | 2024-12-15 03:00 | 성공 | 90일 | 12 | 3.2GB |

---

## 18단계: 알림 시스템 (Slack/Discord 연동)

처리 완료, 검토 요청, 오류 발생 등의 이벤트를 실시간으로 알립니다.

### 알림 설정 테이블 (notification_configs)

```sql
CREATE TABLE notification_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_type ENUM('slack', 'discord', 'email', 'webhook') NOT NULL,
    channel_name VARCHAR(100),
    
    -- 연결 정보
    webhook_url VARCHAR(500),
    api_token VARCHAR(500),
    channel_id VARCHAR(100),
    
    -- 알림 대상 이벤트
    notify_on_complete BOOLEAN DEFAULT TRUE,
    notify_on_error BOOLEAN DEFAULT TRUE,
    notify_on_review_request BOOLEAN DEFAULT TRUE,
    notify_on_approval BOOLEAN DEFAULT TRUE,
    notify_on_upload BOOLEAN DEFAULT TRUE,
    notify_on_backup BOOLEAN DEFAULT FALSE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 알림 이력 테이블 (notification_history)

```sql
CREATE TABLE notification_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    
    -- 알림 내용
    title VARCHAR(200),
    message TEXT,
    metadata JSON,
    
    -- 발송 결과
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    error_message TEXT,
    sent_at DATETIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (config_id) REFERENCES notification_configs(id),
    INDEX idx_event_type (event_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 통합 알림 서비스

```javascript
const axios = require('axios');

class NotificationService {
  constructor(db) {
    this.db = db;
  }

  // Slack 메시지 발송
  async sendSlackMessage(webhookUrl, message) {
    const payload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: message.title, emoji: true }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: message.body }
        }
      ]
    };
    
    if (message.fields) {
      payload.blocks.push({
        type: 'section',
        fields: message.fields.map(f => ({
          type: 'mrkdwn',
          text: `*${f.label}*\n${f.value}`
        }))
      });
    }
    
    if (message.actions) {
      payload.blocks.push({
        type: 'actions',
        elements: message.actions.map(a => ({
          type: 'button',
          text: { type: 'plain_text', text: a.text },
          url: a.url
        }))
      });
    }
    
    return await axios.post(webhookUrl, payload);
  }

  // Discord 메시지 발송
  async sendDiscordMessage(webhookUrl, message) {
    const payload = {
      embeds: [{
        title: message.title,
        description: message.body,
        color: message.color || 0x00ff00,
        fields: message.fields?.map(f => ({
          name: f.label,
          value: f.value,
          inline: true
        })),
        timestamp: new Date().toISOString()
      }]
    };
    
    return await axios.post(webhookUrl, payload);
  }

  // 이메일 발송 (SendGrid 예시)
  async sendEmail(to, message) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    return await sgMail.send({
      to,
      from: 'noreply@youtube-automation.com',
      subject: message.title,
      html: message.htmlBody || message.body
    });
  }

  // 통합 알림 발송
  async sendNotification(eventType, data) {
    // 활성화된 알림 설정 조회
    const [configs] = await this.db.execute(`
      SELECT * FROM notification_configs 
      WHERE is_active = TRUE 
      AND notify_on_${eventType} = TRUE
    `);
    
    const message = this.formatMessage(eventType, data);
    
    for (const config of configs) {
      const historyId = await this.createHistory(config.id, eventType, message);
      
      try {
        switch (config.channel_type) {
          case 'slack':
            await this.sendSlackMessage(config.webhook_url, message);
            break;
          case 'discord':
            await this.sendDiscordMessage(config.webhook_url, message);
            break;
          case 'email':
            await this.sendEmail(config.channel_id, message);
            break;
        }
        
        await this.updateHistoryStatus(historyId, 'sent');
      } catch (error) {
        await this.updateHistoryStatus(historyId, 'failed', error.message);
      }
    }
  }

  // 메시지 포맷팅
  formatMessage(eventType, data) {
    const templates = {
      complete: {
        title: '✅ 콘텐츠 생성 완료',
        body: `프로젝트 "${data.projectName}"의 콘텐츠 생성이 완료되었습니다.`,
        fields: [
          { label: '영상 제목', value: data.videoTitle },
          { label: '포맷', value: data.format },
          { label: '소요 시간', value: data.duration }
        ],
        actions: [
          { text: '다운로드', url: data.downloadUrl },
          { text: '대시보드', url: data.dashboardUrl }
        ],
        color: 0x00ff00
      },
      error: {
        title: '❌ 오류 발생',
        body: `프로젝트 "${data.projectName}"에서 오류가 발생했습니다.\n\`\`\`${data.errorMessage}\`\`\``,
        fields: [
          { label: '단계', value: data.stage },
          { label: '발생 시간', value: data.timestamp }
        ],
        color: 0xff0000
      },
      review_request: {
        title: '📝 검토 요청',
        body: `"${data.projectName}" 프로젝트의 ${data.stage} 검토가 요청되었습니다.`,
        fields: [
          { label: '요청자', value: data.requester },
          { label: '기한', value: data.dueDate }
        ],
        actions: [
          { text: '검토하기', url: data.reviewUrl }
        ],
        color: 0xffaa00
      },
      approval: {
        title: '👍 승인 완료',
        body: `"${data.projectName}" 프로젝트의 ${data.stage}이(가) 승인되었습니다.`,
        fields: [
          { label: '승인자', value: data.approver },
          { label: '코멘트', value: data.comment || '-' }
        ],
        color: 0x00ff00
      },
      upload: {
        title: '🚀 업로드 완료',
        body: `영상이 YouTube에 업로드되었습니다.`,
        fields: [
          { label: '제목', value: data.title },
          { label: '플랫폼', value: data.platform },
          { label: '공개 상태', value: data.privacyStatus }
        ],
        actions: [
          { text: '영상 보기', url: data.videoUrl }
        ],
        color: 0x0000ff
      },
      backup: {
        title: '💾 백업 완료',
        body: `데이터베이스 백업이 완료되었습니다.`,
        fields: [
          { label: '파일 크기', value: data.fileSize },
          { label: '저장 위치', value: data.gcsUrl }
        ],
        color: 0x808080
      }
    };
    
    return templates[eventType] || { title: eventType, body: JSON.stringify(data) };
  }

  async createHistory(configId, eventType, message) {
    const [result] = await this.db.execute(
      `INSERT INTO notification_history (config_id, event_type, title, message, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [configId, eventType, message.title, message.body, JSON.stringify(message)]
    );
    return result.insertId;
  }

  async updateHistoryStatus(historyId, status, errorMessage = null) {
    await this.db.execute(
      `UPDATE notification_history SET status = ?, error_message = ?, sent_at = NOW() WHERE id = ?`,
      [status, errorMessage, historyId]
    );
  }
}
```

### Google Sheets: 알림 설정 시트

| 채널유형 | 채널명 | 완료알림 | 오류알림 | 검토알림 | 승인알림 | 업로드알림 | 백업알림 | 상태 |
|----------|--------|----------|----------|----------|----------|------------|----------|------|
| Slack | #youtube-bot | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | 활성 |
| Discord | 콘텐츠팀 | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | 활성 |
| Email | admin@company.com | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | 활성 |

---

## 최종 시스템 아키텍처 요약

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        YouTube 콘텐츠 자동화 시스템 v5.0                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [입력]                                                                     │
│    ├── 키워드 검색                                                          │
│    ├── 포맷 선택 (숏폼/롱폼)                                                 │
│    └── 템플릿 선택                                                          │
│         ↓                                                                   │
│  [분석 파이프라인]                                                          │
│    ├── YouTube API → 영상 검색 → 터짐 지수 계산                              │
│    ├── 댓글 수집 → Claude API → 감성 분석                                    │
│    └── 자막 추출 → 콘텐츠 요약                                               │
│         ↓                                                                   │
│  [생성 파이프라인]                                                          │
│    ├── 대본 생성 (템플릿 기반)                                               │
│    ├── 이미지 생성 (Midjourney/DALL-E/Flux)                                 │
│    ├── 음성 생성 (ElevenLabs TTS)                                           │
│    ├── 자막 생성 (SRT)                                                      │
│    └── 영상 합성 (FFmpeg/Remotion)                                          │
│         ↓                                                                   │
│  [협업 워크플로우]                                                          │
│    ├── 초안 → 대본검토 → 이미지검토 → 영상검토 → 최종승인                     │
│    └── 알림 (Slack/Discord/Email)                                           │
│         ↓                                                                   │
│  [배포]                                                                     │
│    ├── YouTube 업로드                                                       │
│    ├── TikTok 업로드                                                        │
│    ├── Instagram Reels 업로드                                               │
│    └── A/B 테스트 실행                                                      │
│         ↓                                                                   │
│  [분석 & 최적화]                                                            │
│    ├── 성과 대시보드 (조회수, CTR, 시청시간)                                  │
│    ├── A/B 테스트 결과 분석                                                  │
│    └── 템플릿 성과 피드백                                                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [데이터 저장소]                                                            │
│    ├── MariaDB (메인 데이터베이스)                                           │
│    ├── Google Sheets (협업 & 리포트)                                        │
│    ├── Google Cloud Storage (파일 저장 & 백업)                               │
│    └── 로컬 스토리지 (/storage/projects)                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [정기 작업 (Cron)]                                                         │
│    ├── 매시간: 성과 지표 동기화                                              │
│    ├── 매일 02:00: 전체 백업                                                 │
│    ├── 매일 06:00: A/B 테스트 지표 업데이트                                   │
│    └── 매주: 오래된 백업 정리                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0 | 2024-12-15 | 초기 버전 - 기본 워크플로우 |
| v2.0 | 2024-12-15 | 숏폼/롱폼 포맷 선택 기능 추가 |
| v3.0 | 2024-12-15 | 마크다운 리포트 다운로드 기능 추가 |
| v4.0 | 2024-12-15 | MariaDB 연동 및 Google Sheets 저장 기능 추가 |
| v5.0 | 2024-12-15 | 다중 플랫폼, A/B 테스트, 성과 대시보드, 템플릿, 협업, 백업, 알림 기능 추가 |
| v5.1 | 2024-12-15 | AI 모델 선택 기능 추가 - Gemini 3 Pro (댓글분석), Gemini 3 Pro Image (이미지생성) 기본 설정 |
| v6.0 | 2024-12-15 | 댓글분석→대본생성 채팅 연결 UI, 캐릭터(5명) 설정 및 이미지 생성, 장면별 이미지 생성 워크플로우 추가 |
