import axios from 'axios';
import {
  ContentFormat,
  ClaudeAnalysisResponse,
  ClaudeScriptResponse,
  ContentSummary,
  CommentAnalysis,
  getContentConfig,
} from '@/types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const API_KEY = process.env.CLAUDE_API_KEY;
const MODEL = 'claude-3-opus-20240229';

/**
 * Claude API Service
 * PRD 4단계: 댓글 감성 분석
 * PRD 5단계: 콘텐츠 요약 및 대본 생성
 */
export class ClaudeService {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || API_KEY || '';
    this.model = model || MODEL;
  }

  /**
   * Claude API 호출
   */
  private async callAPI(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<string> {
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    return response.data.content[0].text;
  }

  /**
   * PRD 4단계: 댓글 감성 분석
   * 숏폼은 "재밌다", "꿀잼" 같은 단순 반응도 긍정으로 분류
   */
  async analyzeComments(
    comments: string[],
    format: ContentFormat = 'long'
  ): Promise<ClaudeAnalysisResponse> {
    const systemPrompt = `당신은 YouTube 댓글을 분석하는 전문가입니다.
주어진 댓글들을 긍정/부정으로 분류하고, 요약해주세요.
${format === 'short' ? '이 영상은 숏폼 콘텐츠입니다. "재밌다", "꿀잼", "ㅋㅋㅋ", "ㄹㅇ" 같은 짧은 반응도 긍정으로 분류해주세요.' : ''}

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "positiveCount": 긍정 댓글 수,
  "negativeCount": 부정 댓글 수,
  "positiveSummary": "긍정적 댓글들의 주요 내용 요약 (2-3문장)",
  "negativeSummary": "부정적 댓글들의 주요 내용 요약 (2-3문장)",
  "positiveKeywords": ["긍정 키워드1", "긍정 키워드2", ...],
  "negativeKeywords": ["부정 키워드1", "부정 키워드2", ...],
  "improvementSuggestions": "댓글을 바탕으로 한 개선 제안 (2-3문장)"
}`;

    const userPrompt = `다음 ${comments.length}개의 YouTube 댓글을 분석해주세요:

${comments.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

    const response = await this.callAPI(systemPrompt, userPrompt);

    try {
      // JSON 파싱
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing Claude response:', error);
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
   * PRD 5단계: 콘텐츠 요약
   * 숏폼: 2단계 요약 (핵심 메시지 + 훅 포인트)
   * 롱폼: 4단계 요약 (한 줄 핵심, 주요 논점, 상세 요약, 맥락)
   */
  async summarizeContent(
    transcript: string,
    format: ContentFormat = 'long'
  ): Promise<Partial<ContentSummary>> {
    const isShort = format === 'short';

    const systemPrompt = isShort
      ? `당신은 YouTube 숏폼 콘텐츠 분석 전문가입니다.
주어진 자막/스크립트를 분석하여 2단계로 요약해주세요.

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "oneLineSummary": "핵심 메시지를 한 문장으로",
  "keyPoints": ["훅 포인트 1: 시청자를 사로잡은 요소", "훅 포인트 2: ..."],
  "summaryLevel": "2-step"
}`
      : `당신은 YouTube 콘텐츠 분석 전문가입니다.
주어진 자막/스크립트를 분석하여 4단계로 요약해주세요.

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "oneLineSummary": "한 줄 핵심 요약",
  "keyPoints": ["주요 논점 1", "주요 논점 2", "주요 논점 3"],
  "detailedSummary": "상세 요약 (3-5문장)",
  "contextBackground": "이 주제가 왜 중요한지, 현재 트렌드와의 연관성",
  "summaryLevel": "4-step"
}`;

    const userPrompt = `다음 YouTube 영상의 자막/스크립트를 요약해주세요:

${transcript}`;

    const response = await this.callAPI(systemPrompt, userPrompt);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing summary response:', error);
    }

    return {
      oneLineSummary: '',
      keyPoints: [],
      summaryLevel: isShort ? '2-step' : '4-step',
    };
  }

  /**
   * PRD 5단계: 대본 생성
   * 부정 피드백을 개선한 새로운 대본 생성
   */
  async generateScript(
    summary: Partial<ContentSummary>,
    commentAnalysis: Partial<CommentAnalysis>,
    format: ContentFormat = 'long',
    targetAudience?: string
  ): Promise<ClaudeScriptResponse> {
    const config = getContentConfig(format);
    const isShort = format === 'short';

    const scriptStructure = isShort
      ? `
숏폼 대본 구조:
- 훅 (0~3초): 강렬한 질문이나 반전으로 스크롤을 멈추게 할 첫 문장
- 핵심 (3~45초): 문제 해결 내용을 빠르게 전달
- 클로저 (45~60초): CTA 또는 반전
- 총 150~300자 내외, 속도감 있게`
      : `
롱폼 대본 구조:
- 도입 (0:00~1:00): 문제 공감 및 영상 내용 예고
- 본론: 해결책 상세 설명 (섹션별로 구분)
- 결론: 요약 및 실행 방안, CTA
- 총 1,500~3,000자 내외`;

    const systemPrompt = `당신은 YouTube 콘텐츠 크리에이터를 위한 대본 작가입니다.
원본 영상의 요약과 댓글 분석 결과를 바탕으로, 부정적 피드백을 개선한 새로운 대본을 작성해주세요.

${scriptStructure}

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "fullScript": "전체 대본 (섹션 구분 포함)",
  "hook": "훅/인트로 부분만",
  "intro": "도입부 (롱폼) 또는 빈 문자열 (숏폼)",
  "body": "본론 부분",
  "conclusion": "결론/클로저 부분",
  "estimatedDuration": 예상 영상 길이(초)
}`;

    const userPrompt = `## 원본 영상 요약
핵심 메시지: ${summary.oneLineSummary || ''}
주요 논점: ${(summary.keyPoints || []).join(', ')}
${summary.detailedSummary ? `상세 요약: ${summary.detailedSummary}` : ''}

## 댓글 분석 결과
긍정적 반응: ${commentAnalysis.positiveSummary || ''}
부정적 반응: ${commentAnalysis.negativeSummary || ''}
개선 제안: ${commentAnalysis.improvementSuggestions || ''}

## 타겟 청중
${targetAudience || '일반 시청자'}

## 요청사항
위 정보를 바탕으로 ${isShort ? '숏폼(60초 이내)' : '롱폼(5~10분)'} 대본을 작성해주세요.
특히 부정적 피드백에서 언급된 문제점을 개선한 내용으로 작성해주세요.`;

    const response = await this.callAPI(systemPrompt, userPrompt, 8192);

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
   * 이미지 프롬프트 생성
   * 대본을 분석하여 각 섹션에 맞는 이미지 프롬프트 생성
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

    const systemPrompt = `당신은 YouTube 썸네일과 영상 이미지를 위한 프롬프트 전문가입니다.
주어진 대본을 분석하여 ${imageCount}개의 이미지 생성 프롬프트를 만들어주세요.

각 프롬프트는:
- 영어로 작성
- 실사 스타일 (photorealistic)
- 비율: ${aspectRatio}
- 스타일: ${style}
- Midjourney/DALL-E에 최적화

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "prompts": [
    "프롬프트 1",
    "프롬프트 2",
    ...
  ]
}`;

    const userPrompt = `다음 대본에 맞는 ${imageCount}개의 이미지 프롬프트를 생성해주세요:

${script}`;

    const response = await this.callAPI(systemPrompt, userPrompt);

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

  /**
   * SEO 메타데이터 생성 (제목, 설명, 태그)
   */
  async generateMetadata(
    script: string,
    format: ContentFormat = 'long'
  ): Promise<{
    title: string;
    description: string;
    tags: string[];
    thumbnailText: string;
  }> {
    const isShort = format === 'short';

    const systemPrompt = `당신은 YouTube SEO 전문가입니다.
주어진 대본을 분석하여 최적화된 메타데이터를 생성해주세요.

${isShort ? '숏폼 영상이므로 제목에 #Shorts를 포함하고, 짧고 임팩트 있는 제목을 작성하세요.' : ''}

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "title": "SEO 최적화된 제목 (${isShort ? '30자 이내' : '60자 이내'})",
  "description": "SEO 최적화된 설명 (타임스탬프 포함 권장)",
  "tags": ["태그1", "태그2", "태그3", ...],
  "thumbnailText": "썸네일에 들어갈 짧은 텍스트 (${isShort ? '2-3단어' : '3-5단어'})"
}`;

    const userPrompt = `다음 대본에 맞는 YouTube 메타데이터를 생성해주세요:

${script}`;

    const response = await this.callAPI(systemPrompt, userPrompt);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing metadata:', error);
    }

    return {
      title: '',
      description: '',
      tags: [],
      thumbnailText: '',
    };
  }
}

export default ClaudeService;
