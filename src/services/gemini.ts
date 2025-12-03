import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ContentFormat,
  ClaudeAnalysisResponse,
  ClaudeScriptResponse,
  ContentSummary,
  CommentAnalysis,
  getContentConfig,
} from '@/types';

/**
 * Gemini API Service
 * 댓글 분석 및 대본 생성 서비스
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey?: string) {
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!finalApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(finalApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'models/gemini-3-pro-preview' });
  }

  /**
   * Gemini API 호출
   */
  private async callAPI(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * 댓글 감성 분석
   * 숏폼은 "재밌다", "꿀잼" 같은 단순 반응도 긍정으로 분류
   */
  async analyzeComments(
    comments: string[],
    format: ContentFormat = 'long'
  ): Promise<ClaudeAnalysisResponse> {
    const prompt = `당신은 YouTube 댓글을 분석하는 전문가입니다.
주어진 댓글들을 긍정/부정으로 분류하고, 요약해주세요.
${format === 'short' ? '이 영상은 숏폼 콘텐츠입니다. "재밌다", "꿀잼", "ㅋㅋㅋ", "ㄹㅇ" 같은 짧은 반응도 긍정으로 분류해주세요.' : ''}

반드시 아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이 JSON만):
{
  "positiveCount": 긍정 댓글 수,
  "negativeCount": 부정 댓글 수,
  "positiveSummary": "긍정적 댓글들의 주요 내용 요약 (2-3문장)",
  "negativeSummary": "부정적 댓글들의 주요 내용 요약 (2-3문장)",
  "positiveKeywords": ["긍정 키워드1", "긍정 키워드2"],
  "negativeKeywords": ["부정 키워드1", "부정 키워드2"],
  "improvementSuggestions": "댓글을 바탕으로 한 개선 제안 (2-3문장)"
}

다음 ${comments.length}개의 YouTube 댓글을 분석해주세요:

${comments.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

    const response = await this.callAPI(prompt);

    try {
      // JSON 파싱
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
    }

    // 파싱 실패 시 기본값 반환
    return {
      positiveCount: 0,
      negativeCount: 0,
      positiveSummary: '분석 결과를 파싱할 수 없습니다.',
      negativeSummary: '',
      positiveKeywords: [],
      negativeKeywords: [],
      improvementSuggestions: '',
    };
  }

  /**
   * 대본 생성
   * 주제, 형식, 캐릭터 정보를 바탕으로 대본 생성
   */
  async generateScript(
    topic: string,
    format: ContentFormat = 'long',
    characters: Array<{ name: string; role: string; type: string; personality: string }> = [],
    targetAudience?: string,
    commentAnalysis?: Partial<CommentAnalysis>
  ): Promise<ClaudeScriptResponse> {
    const config = getContentConfig(format);
    const isShort = format === 'short';

    const characterInfo = characters.length > 0
      ? `
## 캐릭터 정보
${characters.map((c, i) => `${i + 1}. ${c.name} (${c.role}): ${c.type}, 성격: ${c.personality}`).join('\n')}`
      : '';

    const commentInfo = commentAnalysis
      ? `
## 참고할 댓글 분석
- 긍정적 반응: ${commentAnalysis.positiveSummary || '없음'}
- 부정적 반응: ${commentAnalysis.negativeSummary || '없음'}
- 개선 제안: ${commentAnalysis.improvementSuggestions || '없음'}`
      : '';

    const scriptStructure = isShort
      ? `
숏폼 대본 구조 (60초 이내):
- 훅 (0~3초): 강렬한 질문이나 반전으로 스크롤을 멈추게 할 첫 문장
- 핵심 (3~45초): 문제 해결 내용을 빠르게 전달
- 클로저 (45~60초): CTA 또는 반전
- 총 150~300자 내외, 속도감 있게`
      : `
롱폼 대본 구조 (5~10분):
- 도입 (0:00~1:00): 문제 공감 및 영상 내용 예고
- 본론: 해결책 상세 설명 (섹션별로 구분)
- 결론: 요약 및 실행 방안, CTA
- 총 1,500~3,000자 내외`;

    const prompt = `당신은 YouTube 콘텐츠 크리에이터를 위한 전문 대본 작가입니다.
주어진 정보를 바탕으로 매력적인 YouTube 대본을 작성해주세요.

${scriptStructure}

## 주제
${topic}

## 타겟 청중
${targetAudience || '일반 시청자'}
${characterInfo}
${commentInfo}

반드시 아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이 JSON만):
{
  "fullScript": "전체 대본 (장면별 구분, 화면 설명, 대사/나레이션 포함)",
  "hook": "훅/인트로 부분 (첫 3초)",
  "intro": "도입부 (롱폼만 해당, 숏폼은 빈 문자열)",
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

    const response = await this.callAPI(prompt);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing script response:', error);
    }

    return {
      fullScript: '',
      hook: '',
      intro: '',
      body: '',
      conclusion: '',
      estimatedDuration: 0,
    };
  }

  /**
   * 대화형 대본 생성 - 채팅 메시지 기반
   */
  async generateChatResponse(
    messages: Array<{ role: string; content: string }>,
    format: ContentFormat = 'long'
  ): Promise<string> {
    const conversationHistory = messages
      .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n');

    const prompt = `당신은 YouTube 대본 작성을 도와주는 AI 어시스턴트입니다.
사용자와 대화하며 대본 작성에 필요한 정보를 수집하고, 적절한 응답을 제공해주세요.

지금까지의 대화:
${conversationHistory}

위 대화를 바탕으로 자연스럽고 도움이 되는 응답을 해주세요.
대본 작성에 필요한 정보(주제, 타겟 청중, 형식, 캐릭터 등)를 차근차근 수집해주세요.
충분한 정보가 모이면 대본 생성을 제안해주세요.

응답은 한국어로, 친근하고 전문적인 톤으로 작성해주세요.`;

    return await this.callAPI(prompt);
  }

  /**
   * 이미지 프롬프트 생성
   */
  async generateImagePrompts(
    script: string,
    format: ContentFormat = 'long',
    count?: number
  ): Promise<string[]> {
    const config = getContentConfig(format);
    const imageCount = count || config.images.count;
    const aspectRatio = format === 'short' ? '9:16' : '16:9';
    const style = format === 'short' ? 'closeup, dramatic' : 'wide shot, contextual';

    const prompt = `당신은 YouTube 썸네일과 영상 이미지를 위한 프롬프트 전문가입니다.
주어진 대본을 분석하여 ${imageCount}개의 이미지 생성 프롬프트를 만들어주세요.

각 프롬프트는:
- 영어로 작성
- 실사 스타일 (photorealistic)
- 비율: ${aspectRatio}
- 스타일: ${style}
- Midjourney/DALL-E에 최적화

대본:
${script}

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "prompts": [
    "프롬프트 1",
    "프롬프트 2"
  ]
}`;

    const response = await this.callAPI(prompt);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.prompts || [];
      }
    } catch (error) {
      console.error('Error parsing image prompts:', error);
    }

    return [];
  }
}

export default GeminiService;
