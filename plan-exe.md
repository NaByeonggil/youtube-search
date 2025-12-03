# YouTube 콘텐츠 자동화 시스템 실행 계획서

## 문서 정보
- **버전**: v2.0
- **작성일**: 2024-12-15
- **기준 문서**: prd-youtube.md v6.0
- **프로젝트명**: YouTube Content Automation System (YCAS)

---

## 1. 프로젝트 개요

### 1.1 목표
YouTube 콘텐츠 분석부터 자동 영상 생성 및 다중 플랫폼 업로드까지 전체 워크플로우를 자동화하는 시스템 구축

### 1.2 핵심 기능
- 키워드 기반 바이럴 영상 분석
- AI 기반 댓글 감성 분석 (Gemini 3 Pro)
- **댓글 분석 → 대본 생성 채팅 연결 UI**
- **캐릭터 설정 (주인공 1명 + 조연 4명 = 5명)**
- 자동 대본 생성 (장면별 구조)
- **캐릭터 이미지 생성 (5장)**
- **장면 이미지 생성 (4~8장)**
- AI 이미지 생성 (Gemini 3 Pro Image)
- TTS 음성 합성
- 자동 영상 제작
- 다중 플랫폼 업로드 (YouTube, TikTok, Instagram)

### 1.3 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 14, React, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js (또는 Fastify) |
| Database | MariaDB |
| Cache | Redis |
| AI - 텍스트 | **models/gemini-3-pro-preview** (기본), Claude, GPT-4o |
| AI - 이미지 | **models/gemini-3-pro-image-preview** (기본), DALL-E 3, Midjourney |
| TTS | ElevenLabs |
| 영상 처리 | FFmpeg, Remotion |
| 저장소 | Google Cloud Storage |
| 협업 | Google Sheets API |
| 알림 | Slack, Discord Webhook |
| 배포 | Docker, Docker Compose |

### 1.4 핵심 워크플로우 요약

```
영상 검색 → 영상 선택 → 댓글 분석 → 채팅으로 대본 방향 설정
                                    ↓
                         캐릭터 설정 (5명)
                                    ↓
                         장면별 대본 생성
                                    ↓
                    캐릭터 이미지 (5장) + 장면 이미지 (5장) + 썸네일 (1장)
                                    ↓
                         음성 + 자막 생성
                                    ↓
                         영상 합성 → 업로드
```

---

## 2. 개발 단계 및 일정

### 2.1 전체 일정 요약

| 단계 | 기간 | 주요 내용 |
|------|------|----------|
| Phase 1 | 2주 | 인프라 구축 및 기본 설정 |
| Phase 2 | 3주 | 핵심 기능 개발 (검색, 분석, 대본) |
| Phase 3 | 3주 | 콘텐츠 생성 기능 (이미지, 음성, 영상) |
| Phase 4 | 2주 | 업로드 및 다중 플랫폼 연동 |
| Phase 5 | 2주 | 부가 기능 (A/B테스트, 대시보드, 협업) |
| Phase 6 | 2주 | 테스트, 최적화, 배포 |
| **총 기간** | **14주** | |

---

## 3. Phase 1: 인프라 구축 (2주)

### 3.1 Week 1: 환경 설정

#### 3.1.1 개발 환경 구성
```bash
# 프로젝트 구조
youtube-automation/
├── apps/
│   ├── web/                 # Next.js 프론트엔드
│   ├── api/                 # Express.js 백엔드
│   └── worker/              # 백그라운드 작업 처리
├── packages/
│   ├── database/            # Prisma/DB 스키마
│   ├── ai-services/         # AI 서비스 통합
│   ├── video-processor/     # FFmpeg 래퍼
│   └── shared/              # 공유 유틸리티
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── Dockerfile.worker
└── docs/
    ├── prd-youtube.md
    └── plan-exe.md
```

#### 3.1.2 작업 목록
- [ ] Git 저장소 생성 및 브랜치 전략 수립
- [ ] Monorepo 설정 (Turborepo 또는 Nx)
- [ ] ESLint, Prettier 설정
- [ ] TypeScript 설정
- [ ] 환경 변수 관리 (.env 템플릿)

### 3.2 Week 2: 데이터베이스 및 인프라

#### 3.2.1 MariaDB 스키마 생성
```sql
-- 실행 순서
1. projects
2. platforms
3. ai_model_configs
4. selected_videos
5. comment_analysis
6. content_summaries
7. script_chat_sessions      -- 신규: 채팅 세션
8. script_chat_messages      -- 신규: 채팅 메시지
9. script_characters         -- 신규: 캐릭터 정보
10. generated_scripts
11. generated_assets
12. upload_history
13. multi_platform_uploads
14. ab_tests
15. ab_test_variants
16. video_analytics
17. templates
18. workflow_stages
19. project_workflows
20. workflow_reviews
21. team_members
22. backup_configs
23. backup_history
24. notification_configs
25. notification_history
26. full_reports
```

#### 3.2.2 작업 목록
- [ ] Docker Compose 설정 (MariaDB, Redis)
- [ ] 전체 DB 스키마 생성 스크립트 작성
- [ ] Prisma 스키마 정의 (또는 직접 SQL)
- [ ] 시드 데이터 준비 (기본 설정값)
- [ ] DB 마이그레이션 스크립트 작성
- [ ] Google Cloud Storage 버킷 생성
- [ ] 파일 저장소 디렉토리 구조 설정

#### 3.2.3 API 키 발급 및 설정
- [ ] Google AI API Key (Gemini, Imagen)
- [ ] YouTube Data API Key
- [ ] ElevenLabs API Key
- [ ] Google Sheets API 서비스 계정
- [ ] Google Cloud Storage 서비스 계정
- [ ] (선택) Anthropic API Key
- [ ] (선택) OpenAI API Key

#### 3.2.4 환경 변수 템플릿
```bash
# .env.template
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=youtube_app
DB_PASSWORD=
DB_NAME=youtube_automation

# Redis
REDIS_URL=redis://localhost:6379

# Google AI
GEMINI_API_KEY=

# YouTube
YOUTUBE_API_KEY=

# ElevenLabs
ELEVENLABS_API_KEY=

# Google Cloud
GCS_PROJECT_ID=
GCS_BUCKET_NAME=
GCS_KEY_FILE=

# Google Sheets
GOOGLE_SPREADSHEET_ID=

# Notifications
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=

# Optional AI Providers
CLAUDE_API_KEY=
OPENAI_API_KEY=
```

### 3.3 Phase 1 산출물
- [ ] 프로젝트 저장소 (초기화 완료)
- [ ] Docker 개발 환경
- [ ] 데이터베이스 스키마 (전체)
- [ ] API 키 설정 완료
- [ ] 기본 CI/CD 파이프라인

---

## 4. Phase 2: 핵심 기능 개발 (3주)

### 4.1 Week 3: YouTube 검색 및 데이터 수집

#### 4.1.1 기능 목록
- [ ] YouTube Data API 클라이언트 구현
- [ ] 키워드 검색 기능 (`search.list`)
- [ ] 영상 상세 정보 조회 (`videos.list`)
- [ ] 채널 정보 조회 (`channels.list`)
- [ ] 터짐 지수 계산 로직
- [ ] 5단계 등급 분류 로직

#### 4.1.2 API 엔드포인트
```
POST   /api/projects                    # 프로젝트 생성
GET    /api/projects/:id                # 프로젝트 조회
POST   /api/search                      # 키워드 검색
GET    /api/search/results/:projectId   # 검색 결과 조회
POST   /api/videos/select               # 영상 선택
```

#### 4.1.3 서비스 클래스
```typescript
// packages/ai-services/src/youtube.service.ts
class YouTubeService {
  searchVideos(keyword: string, format: 'short' | 'long'): Promise<Video[]>
  getVideoDetails(videoId: string): Promise<VideoDetail>
  getChannelStats(channelId: string): Promise<ChannelStats>
  calculateViralScore(video: VideoDetail, channel: ChannelStats): number
  classifyViralGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D'
}
```

### 4.2 Week 4: 댓글 수집 및 AI 분석 + 채팅 연결

#### 4.2.1 기능 목록
- [ ] 댓글 수집 기능 (`commentThreads.list`)
- [ ] Gemini API 클라이언트 구현 (models/gemini-3-pro-preview)
- [ ] 댓글 감성 분석 프롬프트 설계
- [ ] 긍정/부정 분류 로직
- [ ] 키워드 추출 및 요약 생성
- [ ] 분석 결과 DB 저장
- [ ] **댓글 분석 결과 복사/적용 버튼 UI**
- [ ] **대본 생성 채팅 세션 시작 기능**
- [ ] **채팅형 입력 인터페이스 구현**

#### 4.2.2 API 엔드포인트
```
POST   /api/comments/collect/:videoId      # 댓글 수집
POST   /api/comments/analyze/:videoId      # 댓글 분석
GET    /api/comments/analysis/:videoId     # 분석 결과 조회

# 채팅 연결 API (신규)
POST   /api/script-chat/start              # 채팅 세션 시작 (분석 결과 연결)
POST   /api/script-chat/message            # 메시지 전송
GET    /api/script-chat/session/:id        # 세션 조회
GET    /api/script-chat/messages/:sessionId # 메시지 이력 조회
```

#### 4.2.3 AI 서비스 클래스
```typescript
// packages/ai-services/src/gemini.service.ts
class GeminiService {
  constructor(apiKey: string)
  analyzeComments(comments: string[]): Promise<CommentAnalysis>
  generateScript(context: ScriptContext): Promise<Script>
  summarizeContent(transcript: string): Promise<ContentSummary>
  
  // 채팅 관련 메서드 (신규)
  generateChatResponse(systemPrompt: string, history: Message[]): Promise<string>
  extractCharacterInfo(message: string): Promise<Character[] | null>
}

interface CommentAnalysis {
  positive: { count: number; percentage: number; summary: string; keywords: string[] }
  negative: { count: number; percentage: number; summary: string; keywords: string[]; improvements: string[] }
}
```

#### 4.2.4 채팅 세션 서비스 (신규)
```typescript
// packages/ai-services/src/script-chat.service.ts
class ScriptChatService {
  constructor(db: Database, geminiService: GeminiService)
  
  // 세션 관리
  startSession(videoId: number, commentAnalysisId: number): Promise<SessionResult>
  sendMessage(sessionId: number, userMessage: string): Promise<ChatResponse>
  getSession(sessionId: number): Promise<Session>
  getMessageHistory(sessionId: number): Promise<Message[]>
  
  // 캐릭터 추출
  extractCharacterInfo(message: string): Promise<Character[] | null>
  updateCharacters(sessionId: number, characters: Character[]): Promise<void>
  getCharacters(sessionId: number): Promise<Character[]>
  
  // 대본 생성
  checkReadyToGenerate(sessionId: number): Promise<boolean>
  generateScript(sessionId: number): Promise<ScriptResult>
}

interface ChatResponse {
  response: string
  readyToGenerate: boolean
  characters: Character[]
}
```

#### 4.2.5 채팅 UI 컴포넌트
```
components/script-chat/
├── ScriptChatInput.tsx       # 메인 채팅 컴포넌트
├── CommentAnalysisCard.tsx   # 분석 결과 카드 (복사/적용 버튼)
├── ChatMessage.tsx           # 개별 메시지 컴포넌트
├── CharacterList.tsx         # 추출된 캐릭터 목록
└── GenerateButton.tsx        # 대본 생성 버튼
```

### 4.3 Week 5: 캐릭터 설정 및 대본 생성

#### 4.3.1 기능 목록
- [ ] YouTube 자막 추출 기능
- [ ] Whisper API 연동 (자막 없는 경우)
- [ ] 콘텐츠 4단계 요약 프롬프트
- [ ] **캐릭터 설정 UI (5명: 주인공 1 + 조연 4)**
- [ ] **캐릭터 정보 DB 저장 (script_characters 테이블)**
- [ ] **장면(Scene) 기반 대본 구조 설계**
- [ ] 대본 생성 프롬프트 (숏폼/롱폼)
- [ ] 템플릿 시스템 기본 구현
- [ ] 대본 편집 UI

#### 4.3.2 캐릭터 데이터 구조
```typescript
interface ScriptCharacter {
  id: number
  sessionId: number
  scriptId: number
  
  // 기본 정보
  role: 'protagonist' | 'supporting' | 'narrator'
  characterName: string
  characterType: string  // 영양사, 트레이너, 직장인 등
  
  // 외모 설정 (이미지 생성용)
  gender: 'male' | 'female' | 'neutral'
  ageRange: string       // 20대 후반, 30대 초반 등
  appearanceDescription: string
  clothingStyle: string
  
  // 성격 및 말투
  personality: string
  speakingStyle: string
  voiceStyle: string     // TTS 음성 스타일
  
  // 이미지 생성
  imagePrompt: string
  generatedImagePath: string
  generatedImageUrl: string
}
```

#### 4.3.3 장면 기반 대본 구조
```typescript
interface ScriptScene {
  sceneNumber: number
  sceneTitle: string
  duration: number  // 초
  
  // 등장 캐릭터
  characters: {
    characterId: number
    characterName: string
    action: string
  }[]
  
  // 대사/나레이션
  dialogues: {
    characterId: number | null
    type: 'dialogue' | 'narration' | 'voiceover'
    text: string
    emotion: string
  }[]
  
  // 화면 설명
  visualDescription: string
  cameraAngle: string
  subtitleText: string
}
```

#### 4.3.4 API 엔드포인트
```
POST   /api/content/extract/:videoId       # 자막/스크립트 추출
POST   /api/content/summarize/:videoId     # 콘텐츠 요약

# 캐릭터 API (신규)
GET    /api/characters/:sessionId          # 캐릭터 목록 조회
POST   /api/characters                     # 캐릭터 추가
PUT    /api/characters/:id                 # 캐릭터 수정
DELETE /api/characters/:id                 # 캐릭터 삭제

# 대본 API
POST   /api/scripts/generate               # 대본 생성 (캐릭터 포함)
PUT    /api/scripts/:id                    # 대본 수정
GET    /api/scripts/:id/scenes             # 장면 목록 조회
PUT    /api/scripts/:id/scenes/:sceneNum   # 장면 수정

GET    /api/templates                      # 템플릿 목록
POST   /api/templates/apply                # 템플릿 적용
```

#### 4.3.5 캐릭터 설정 UI 컴포넌트
```
components/characters/
├── CharacterList.tsx         # 캐릭터 목록 (5명)
├── CharacterCard.tsx         # 개별 캐릭터 카드
├── CharacterForm.tsx         # 캐릭터 편집 폼
├── CharacterImagePreview.tsx # 생성된 이미지 미리보기
└── AddCharacterModal.tsx     # 캐릭터 추가 모달
```

#### 4.3.6 대본 편집 UI 컴포넌트
```
components/script/
├── ScriptEditor.tsx          # 전체 대본 편집기
├── SceneList.tsx             # 장면 목록
├── SceneCard.tsx             # 개별 장면 카드
├── DialogueEditor.tsx        # 대사 편집기
├── CharacterSelector.tsx     # 장면별 캐릭터 선택
└── ScriptPreview.tsx         # 대본 미리보기
```

### 4.4 Phase 2 산출물
- [ ] YouTube 검색 기능 완료
- [ ] 터짐 지수 계산 및 분류 완료
- [ ] 댓글 분석 기능 완료
- [ ] **댓글 분석 → 대본 생성 채팅 연결 완료**
- [ ] **캐릭터 설정 기능 완료 (5명)**
- [ ] 대본 생성 기능 완료
- [ ] 기본 API 문서 (Swagger/OpenAPI)

---

## 5. Phase 3: 콘텐츠 생성 (3주)

### 5.1 Week 6: 캐릭터 이미지 + 장면 이미지 생성

#### 5.1.1 기능 목록
- [ ] Gemini 3 Pro Image API 클라이언트 구현 (models/gemini-3-pro-image-preview)
- [ ] **캐릭터 정보 → 이미지 프롬프트 자동 변환**
- [ ] **캐릭터 이미지 생성 (5장: 주인공 1 + 조연 4)**
- [ ] **장면 이미지 생성 (4~8장)**
- [ ] **썸네일 이미지 생성 (1장)**
- [ ] 숏폼/롱폼별 이미지 비율 설정
- [ ] 다중 이미지 일괄 생성
- [ ] 이미지 재생성 기능
- [ ] 이미지 저장 및 관리

#### 5.1.2 이미지 생성 워크플로우
```
Step 1: 캐릭터 이미지 생성 (5장)
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ ⭐  │ │ 👤  │ │ 👤  │ │ 👤  │ │ 👤  │
│주인공│ │조연1│ │조연2│ │조연3│ │조연4│
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘

Step 2: 장면 이미지 생성 (5장)
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Scene1 │ │Scene2 │ │Scene3 │ │Scene4 │ │Scene5 │
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘

Step 3: 썸네일 생성 (1장)
┌─────────────────┐
│    THUMBNAIL    │
└─────────────────┘

총 생성: 11장
```

#### 5.1.3 서비스 클래스
```typescript
// packages/ai-services/src/character-image.service.ts
class CharacterImageGenerator {
  constructor(geminiImageService: GeminiImageService, db: Database)
  
  // 프롬프트 생성
  buildCharacterPrompt(character: Character, format: 'short' | 'long'): string
  
  // 단일 캐릭터 이미지 생성
  generateSingleCharacter(characterId: number, format: 'short' | 'long'): Promise<ImageResult>
  
  // 전체 캐릭터 일괄 생성 (5장)
  generateAllCharacters(sessionId: number, format: 'short' | 'long'): Promise<ImageResult[]>
}

// packages/ai-services/src/scene-image.service.ts
class SceneImageGenerator {
  constructor(geminiImageService: GeminiImageService, db: Database)
  
  // 프롬프트 생성
  buildScenePrompt(scene: Scene, characters: Character[], format: 'short' | 'long'): string
  
  // 전체 장면 이미지 생성
  generateAllSceneImages(scriptId: number, format: 'short' | 'long'): Promise<ImageResult[]>
}

// packages/ai-services/src/gemini-image.service.ts
class GeminiImageService {
  constructor(apiKey: string)
  generateImage(prompt: string, options: ImageOptions): Promise<ImageResult>
}

interface ImageOptions {
  aspectRatio: '9:16' | '16:9'
  resolution: string
  style: 'photorealistic' | 'cinematic'
}

interface ImageResult {
  success: boolean
  mimeType: string
  data: string  // base64
  filePath: string
  prompt: string
}
```

#### 5.1.4 API 엔드포인트
```
# 캐릭터 이미지 API
POST   /api/images/characters/generate/:characterId   # 단일 캐릭터 이미지 생성
POST   /api/images/characters/generate-all/:sessionId # 전체 캐릭터 이미지 생성 (5장)
POST   /api/images/characters/:id/regenerate          # 캐릭터 이미지 재생성
GET    /api/images/characters/:sessionId              # 캐릭터 이미지 목록

# 장면 이미지 API
POST   /api/images/scenes/generate/:scriptId          # 전체 장면 이미지 생성
POST   /api/images/scenes/:sceneNum/regenerate        # 장면 이미지 재생성
GET    /api/images/scenes/:scriptId                   # 장면 이미지 목록

# 썸네일 API
POST   /api/images/thumbnail/generate/:scriptId       # 썸네일 생성
POST   /api/images/thumbnail/:id/regenerate           # 썸네일 재생성

# 통합 API
POST   /api/images/generate-all                       # 전체 이미지 일괄 생성 (11장)
GET    /api/images/progress/:jobId                    # 생성 진행률 조회
GET    /api/images/:scriptId                          # 스크립트별 전체 이미지 조회
```

#### 5.1.5 파일 저장 구조
```
/storage/projects/{project_id}/{video_id}/
├── /characters/              # 캐릭터 이미지 (5장)
│   ├── char_protagonist_김지영.png
│   ├── char_supporting_박영양.png
│   ├── char_supporting_이트레이너.png
│   ├── char_supporting_최동료.png
│   └── char_supporting_정멘토.png
├── /scenes/                  # 장면 이미지 (4~8장)
│   ├── scene_01_오프닝.png
│   ├── scene_02_사무실.png
│   ├── scene_03_상담실.png
│   ├── scene_04_성공사례.png
│   └── scene_05_마무리.png
└── /thumbnails/              # 썸네일 (1~3장)
    └── thumbnail_main.png
```

#### 5.1.6 이미지 생성 UI 컴포넌트
```
components/images/
├── ImageGenerationWorkflow.tsx   # 전체 워크플로우 UI
├── CharacterImageGrid.tsx        # 캐릭터 이미지 그리드 (5장)
├── SceneImageGrid.tsx            # 장면 이미지 그리드
├── ThumbnailPreview.tsx          # 썸네일 미리보기
├── ImageCard.tsx                 # 개별 이미지 카드 (재생성 버튼)
├── ProgressBar.tsx               # 생성 진행률 표시
└── DownloadAllButton.tsx         # 전체 다운로드 버튼
```

### 5.2 Week 7: 음성 합성 및 자막

#### 5.2.1 기능 목록
- [ ] ElevenLabs API 클라이언트 구현
- [ ] 보이스 선택 기능
- [ ] 대본 기반 TTS 생성
- [ ] 숏폼/롱폼별 음성 속도 조절
- [ ] SRT 자막 파일 생성
- [ ] 음성-자막 싱크 맞추기

#### 5.2.2 서비스 클래스
```typescript
// packages/ai-services/src/tts.service.ts
class TTSService {
  constructor(apiKey: string)
  getVoices(): Promise<Voice[]>
  generateSpeech(text: string, options: TTSOptions): Promise<AudioResult>
  generateSubtitles(text: string, audio: AudioResult): Promise<SubtitleResult>
}

interface TTSOptions {
  voiceId: string
  speed: number  // 0.5 ~ 2.0
  format: 'mp3' | 'wav'
}
```

#### 5.2.3 API 엔드포인트
```
GET    /api/tts/voices                  # 보이스 목록
POST   /api/tts/generate                # 음성 생성
POST   /api/subtitles/generate          # 자막 생성
GET    /api/assets/:scriptId            # 에셋 목록 조회
```

### 5.3 Week 8: 영상 합성

#### 5.3.1 기능 목록
- [ ] FFmpeg 래퍼 구현
- [ ] 이미지 시퀀스 → 영상 변환
- [ ] Ken Burns 효과 적용
- [ ] 음성 트랙 합성
- [ ] 자막 오버레이
- [ ] 숏폼/롱폼별 인코딩 설정

#### 5.3.2 서비스 클래스
```typescript
// packages/video-processor/src/ffmpeg.service.ts
class FFmpegService {
  createVideoFromImages(images: string[], options: VideoOptions): Promise<string>
  addAudioTrack(videoPath: string, audioPath: string): Promise<string>
  addSubtitles(videoPath: string, srtPath: string, style: SubtitleStyle): Promise<string>
  applyKenBurnsEffect(imagePath: string, duration: number): Promise<string>
  encodeForPlatform(inputPath: string, platform: Platform): Promise<string>
}

interface VideoOptions {
  resolution: string
  fps: number
  codec: string
  format: 'short' | 'long'
}
```

#### 5.3.3 API 엔드포인트
```
POST   /api/video/compose               # 영상 합성 시작
GET    /api/video/status/:jobId         # 합성 상태 확인
GET    /api/video/:scriptId             # 최종 영상 조회
POST   /api/video/:id/download          # 영상 다운로드
```

### 5.4 Phase 3 산출물
- [ ] **캐릭터 이미지 생성 완료 (5장)**
- [ ] **장면 이미지 생성 완료 (4~8장)**
- [ ] **썸네일 이미지 생성 완료 (1장)**
- [ ] TTS 음성 합성 완료
- [ ] 자막 생성 완료
- [ ] 영상 합성 파이프라인 완료
- [ ] 에셋 관리 시스템

---

## 6. Phase 4: 업로드 및 플랫폼 연동 (2주)

### 6.1 Week 9: YouTube 업로드

#### 6.1.1 기능 목록
- [ ] YouTube OAuth 2.0 인증 구현
- [ ] 영상 업로드 기능 (`videos.insert`)
- [ ] 썸네일 설정 (`thumbnails.set`)
- [ ] 메타데이터 설정 (제목, 설명, 태그)
- [ ] 예약 업로드 기능
- [ ] 업로드 이력 관리

#### 6.1.2 API 엔드포인트
```
GET    /api/youtube/auth                # OAuth 인증 시작
GET    /api/youtube/callback            # OAuth 콜백
POST   /api/youtube/upload              # 영상 업로드
PUT    /api/youtube/:videoId/metadata   # 메타데이터 수정
POST   /api/youtube/:videoId/thumbnail  # 썸네일 설정
```

### 6.2 Week 10: 다중 플랫폼 연동

#### 6.2.1 기능 목록
- [ ] TikTok Content Posting API 연동
- [ ] Instagram Graph API 연동
- [ ] 플랫폼별 영상 최적화
- [ ] 플랫폼별 메타데이터 변환
- [ ] 일괄 업로드 기능
- [ ] 업로드 상태 추적

#### 6.2.2 API 엔드포인트
```
POST   /api/upload/multi                # 다중 플랫폼 업로드
GET    /api/upload/status/:jobId        # 업로드 상태
GET    /api/platforms                   # 연동된 플랫폼 목록
POST   /api/platforms/:code/connect     # 플랫폼 연동
DELETE /api/platforms/:code/disconnect  # 플랫폼 연동 해제
```

### 6.3 Phase 4 산출물
- [ ] YouTube 업로드 완료
- [ ] TikTok 연동 완료
- [ ] Instagram 연동 완료
- [ ] 다중 플랫폼 업로드 UI

---

## 7. Phase 5: 부가 기능 (2주)

### 7.1 Week 11: A/B 테스트 및 대시보드

#### 7.1.1 A/B 테스트 기능
- [ ] 테스트 생성 UI
- [ ] 변형(Variant) 생성 및 업로드
- [ ] 성과 지표 자동 수집
- [ ] 통계적 유의성 분석
- [ ] 승자 자동 판정

#### 7.1.2 성과 대시보드
- [ ] YouTube Analytics API 연동
- [ ] 일별 성과 데이터 수집 (크론)
- [ ] 대시보드 UI (차트, 테이블)
- [ ] 영상별 성과 비교
- [ ] 프로젝트별 성과 요약

#### 7.1.3 API 엔드포인트
```
# A/B 테스트
POST   /api/ab-tests                    # 테스트 생성
GET    /api/ab-tests/:id                # 테스트 상세
POST   /api/ab-tests/:id/variants       # 변형 추가
PUT    /api/ab-tests/:id/start          # 테스트 시작
GET    /api/ab-tests/:id/results        # 결과 조회

# 대시보드
GET    /api/dashboard/summary           # 요약 데이터
GET    /api/dashboard/trend             # 추이 데이터
GET    /api/dashboard/ranking           # 영상 순위
GET    /api/analytics/:videoId          # 영상별 분석
```

### 7.2 Week 12: 협업 및 알림

#### 7.2.1 협업 워크플로우
- [ ] 워크플로우 단계 관리
- [ ] 검토 요청/승인 기능
- [ ] 코멘트 및 변경 요청
- [ ] 담당자 지정
- [ ] 기한 관리

#### 7.2.2 Google Sheets 연동
- [ ] 실시간 데이터 동기화
- [ ] 시트 자동 생성
- [ ] 데이터 일괄 내보내기

#### 7.2.3 알림 시스템
- [ ] Slack Webhook 연동
- [ ] Discord Webhook 연동
- [ ] 이메일 알림 (SendGrid)
- [ ] 알림 설정 UI

#### 7.2.4 백업 자동화
- [ ] 일일 자동 백업 크론
- [ ] GCS 업로드
- [ ] 보관 기간 관리
- [ ] 복원 기능

#### 7.2.5 API 엔드포인트
```
# 협업
GET    /api/workflows/:projectId        # 워크플로우 상태
POST   /api/workflows/:id/review        # 검토 요청
POST   /api/workflows/:id/approve       # 승인
POST   /api/workflows/:id/reject        # 반려

# 알림
GET    /api/notifications/configs       # 알림 설정 조회
PUT    /api/notifications/configs/:id   # 알림 설정 수정
GET    /api/notifications/history       # 알림 이력

# 백업
POST   /api/backup/run                  # 수동 백업
GET    /api/backup/history              # 백업 이력
POST   /api/backup/restore/:id          # 복원
```

### 7.3 Phase 5 산출물
- [ ] A/B 테스트 기능 완료
- [ ] 성과 대시보드 완료
- [ ] 협업 워크플로우 완료
- [ ] Google Sheets 연동 완료
- [ ] 알림 시스템 완료
- [ ] 백업 자동화 완료

---

## 8. Phase 6: 테스트 및 배포 (2주)

### 8.1 Week 13: 테스트

#### 8.1.1 테스트 범위
- [ ] 단위 테스트 (Jest)
- [ ] 통합 테스트 (API)
- [ ] E2E 테스트 (Playwright)
- [ ] 부하 테스트 (k6)
- [ ] 보안 테스트

#### 8.1.2 테스트 시나리오
```
1. 키워드 검색 → 영상 선택 → 댓글 분석 전체 플로우
2. 댓글 분석 → 채팅으로 대본 방향 설정 → 캐릭터 추출 플로우 (신규)
3. 캐릭터 설정 (5명) → 장면별 대본 생성 플로우 (신규)
4. 캐릭터 이미지 (5장) + 장면 이미지 (5장) 생성 플로우 (신규)
5. 이미지 + 음성 + 자막 → 영상 합성 전체 플로우
6. 다중 플랫폼 업로드 플로우
7. A/B 테스트 생성 및 결과 분석 플로우
8. 협업 워크플로우 (검토 → 승인 → 업로드)
9. 백업 및 복원 플로우
```

### 8.2 Week 14: 최적화 및 배포

#### 8.2.1 최적화
- [ ] 쿼리 최적화 (인덱스, N+1 해결)
- [ ] 캐싱 전략 적용 (Redis)
- [ ] 이미지 최적화
- [ ] 번들 사이즈 최적화
- [ ] API 응답 시간 개선

#### 8.2.2 배포
- [ ] Docker 이미지 최적화
- [ ] Kubernetes 매니페스트 (또는 Docker Compose)
- [ ] CI/CD 파이프라인 완성
- [ ] 모니터링 설정 (Prometheus, Grafana)
- [ ] 로깅 설정 (ELK 또는 CloudWatch)
- [ ] 도메인 및 SSL 설정

#### 8.2.3 문서화
- [ ] API 문서 완성
- [ ] 사용자 가이드
- [ ] 운영 가이드
- [ ] 트러블슈팅 가이드

### 8.3 Phase 6 산출물
- [ ] 테스트 커버리지 80% 이상
- [ ] 프로덕션 배포 완료
- [ ] 모니터링 대시보드
- [ ] 운영 문서

---

## 9. 프론트엔드 화면 목록

### 9.1 주요 화면

| 화면 | 경로 | 설명 |
|------|------|------|
| 대시보드 | `/` | 프로젝트 목록, 성과 요약 |
| 프로젝트 생성 | `/projects/new` | 키워드 입력, 포맷 선택 |
| 검색 결과 | `/projects/:id/search` | 터짐 지수별 영상 목록 |
| 영상 분석 | `/projects/:id/videos/:videoId` | 댓글 분석, 콘텐츠 요약 |
| **대본 채팅** | `/projects/:id/script-chat` | **댓글 분석 연결 + 채팅형 대본 설정** |
| **캐릭터 설정** | `/projects/:id/characters` | **주인공(1) + 조연(4) 설정** |
| 대본 편집 | `/projects/:id/scripts/:scriptId` | 장면별 대본 생성/수정 |
| **이미지 생성** | `/projects/:id/images` | **캐릭터(5) + 장면(5) + 썸네일(1) 생성** |
| 에셋 관리 | `/projects/:id/assets` | 이미지, 음성, 자막 관리 |
| 영상 미리보기 | `/projects/:id/preview` | 합성 영상 미리보기 |
| 업로드 | `/projects/:id/upload` | 플랫폼 선택 및 업로드 |
| A/B 테스트 | `/ab-tests` | 테스트 목록 및 결과 |
| 성과 분석 | `/analytics` | 성과 대시보드 |
| 템플릿 | `/templates` | 템플릿 관리 |
| 설정 | `/settings` | AI 모델, 알림, 플랫폼 설정 |

### 9.2 UI 컴포넌트

```
components/
├── layout/
│   ├── Header
│   ├── Sidebar
│   └── Footer
├── video/
│   ├── VideoCard
│   ├── VideoList
│   ├── ViralBadge
│   └── VideoPlayer
├── analysis/
│   ├── CommentAnalysisCard      # 분석 결과 + 복사/적용 버튼
│   ├── SentimentChart
│   └── KeywordCloud
├── script-chat/                       # 신규: 대본 채팅
│   ├── ScriptChatInput               # 메인 채팅 컴포넌트
│   ├── ChatMessage                   # 개별 메시지
│   ├── CharacterExtractList          # 추출된 캐릭터 목록
│   └── GenerateScriptButton          # 대본 생성 버튼
├── characters/                        # 신규: 캐릭터 관리
│   ├── CharacterList                 # 캐릭터 목록 (5명)
│   ├── CharacterCard                 # 개별 캐릭터 카드
│   ├── CharacterForm                 # 캐릭터 편집 폼
│   ├── CharacterImagePreview         # 이미지 미리보기
│   └── AddCharacterModal             # 캐릭터 추가 모달
├── script/
│   ├── ScriptEditor                  # 장면별 대본 편집
│   ├── SceneList                     # 장면 목록
│   ├── SceneCard                     # 개별 장면 카드
│   ├── DialogueEditor                # 대사 편집기
│   ├── TemplateSelector
│   └── ScriptPreview
├── images/                            # 신규: 이미지 생성
│   ├── ImageGenerationWorkflow       # 전체 워크플로우
│   ├── CharacterImageGrid            # 캐릭터 이미지 (5장)
│   ├── SceneImageGrid                # 장면 이미지 (5장)
│   ├── ThumbnailPreview              # 썸네일 (1장)
│   ├── ImageCard                     # 개별 이미지 + 재생성
│   └── ProgressBar                   # 생성 진행률
├── assets/
│   ├── ImageGallery
│   ├── AudioPlayer
│   └── SubtitleEditor
├── upload/
│   ├── PlatformSelector
│   ├── MetadataForm
│   └── UploadProgress
├── dashboard/
│   ├── StatCard
│   ├── TrendChart
│   └── RankingTable
└── common/
    ├── Button
    ├── Modal
    ├── Toast
    └── LoadingSpinner
```

---

## 10. 크론 작업 목록

| 작업 | 스케줄 | 설명 |
|------|--------|------|
| 성과 지표 수집 | 매시간 | YouTube Analytics에서 데이터 동기화 |
| A/B 테스트 업데이트 | 매일 06:00 | 테스트 지표 업데이트 및 승자 판정 |
| DB 백업 | 매일 02:00 | MariaDB → GCS 전체 백업 |
| 오래된 백업 정리 | 매주 일 03:00 | 보관 기간 지난 백업 삭제 |
| 임시 파일 정리 | 매일 04:00 | /tmp 디렉토리 정리 |
| Google Sheets 동기화 | 매 10분 | 최신 데이터 동기화 |

---

## 11. 리스크 관리

### 11.1 기술적 리스크

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| API 할당량 초과 | 높음 | 캐싱, 요청 최적화, 할당량 모니터링 |
| AI 모델 응답 지연 | 중간 | 타임아웃 설정, 대체 모델 준비 |
| 영상 합성 실패 | 높음 | 재시도 로직, 상세 로깅 |
| 플랫폼 API 변경 | 중간 | API 버전 고정, 변경 모니터링 |

### 11.2 비용 리스크

| 항목 | 예상 월 비용 | 비고 |
|------|-------------|------|
| Google AI (Gemini) | $50~200 | 사용량 비례 |
| Google AI (Imagen) | $40~150 | 이미지당 $0.04 |
| ElevenLabs | $22~99 | 플랜 선택 |
| YouTube API | 무료 | 일일 할당량 10,000 |
| GCS | $10~50 | 저장 용량 비례 |
| 서버 | $50~200 | 인스턴스 사양 |

---

## 12. 성공 기준 (KPI)

### 12.1 개발 KPI
- [ ] 전체 기능 구현 완료
- [ ] 테스트 커버리지 80% 이상
- [ ] API 평균 응답 시간 500ms 이하
- [ ] 영상 합성 성공률 95% 이상

### 12.2 운영 KPI
- [ ] 시스템 가용성 99.5% 이상
- [ ] 일일 콘텐츠 생성 가능 수: 10개 이상
- [ ] 업로드 성공률 98% 이상

---

## 13. 팀 역할 분담 (예시)

| 역할 | 담당 영역 |
|------|----------|
| PM | 일정 관리, 요구사항 조율 |
| 프론트엔드 | Next.js UI, 컴포넌트 개발 |
| 백엔드 | API 서버, DB, 비즈니스 로직 |
| AI/ML | AI 서비스 연동, 프롬프트 최적화 |
| 영상 처리 | FFmpeg, 영상 합성 파이프라인 |
| DevOps | 인프라, CI/CD, 모니터링 |

---

## 14. 체크리스트 요약

### Phase 1 (인프라) ⬜
- [ ] 개발 환경 구성
- [ ] DB 스키마 생성 (26개 테이블)
- [ ] API 키 발급 (Gemini, YouTube, ElevenLabs)
- [ ] Docker 환경 구축

### Phase 2 (핵심 기능) ⬜
- [ ] YouTube 검색
- [ ] 댓글 분석 (Gemini 3 Pro)
- [ ] **댓글 분석 → 대본 채팅 연결 UI**
- [ ] **캐릭터 설정 (5명)**
- [ ] **장면별 대본 생성**

### Phase 3 (콘텐츠 생성) ⬜
- [ ] **캐릭터 이미지 생성 (5장)**
- [ ] **장면 이미지 생성 (5장)**
- [ ] **썸네일 생성 (1장)**
- [ ] 음성 합성 (ElevenLabs)
- [ ] 영상 합성 (FFmpeg)

### Phase 4 (업로드) ⬜
- [ ] YouTube 업로드
- [ ] 다중 플랫폼 연동

### Phase 5 (부가 기능) ⬜
- [ ] A/B 테스트
- [ ] 대시보드
- [ ] 협업 기능
- [ ] 알림/백업

### Phase 6 (배포) ⬜
- [ ] 테스트 완료
- [ ] 프로덕션 배포
- [ ] 문서화 완료

---

## 15. 참고 자료

- [PRD 문서](./prd-youtube.md)
- [YouTube Data API 문서](https://developers.google.com/youtube/v3)
- [Google AI for Developers](https://ai.google.dev/)
- [ElevenLabs API 문서](https://docs.elevenlabs.io/)
- [FFmpeg 문서](https://ffmpeg.org/documentation.html)
- [TikTok Content Posting API](https://developers.tiktok.com/)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
