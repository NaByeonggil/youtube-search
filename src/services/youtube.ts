import axios from 'axios';
import {
  YouTubeSearchResult,
  YouTubeVideoDetails,
  YouTubeChannelDetails,
  ContentFormat,
  ViralGrade,
  ViralScoreResult,
} from '@/types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * YouTube API Service
 * PRD 1단계: YouTube 키워드 검색 및 데이터 수집
 */
export class YouTubeService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || API_KEY || '';
  }

  /**
   * 키워드로 영상 검색
   * 포맷에 따라 videoDuration 필터링 적용
   */
  async searchVideos(
    keyword: string,
    format: ContentFormat = 'long',
    maxResults = 50
  ): Promise<YouTubeSearchResult[]> {
    // 숏폼: short (4분 이하), 롱폼: medium/long (4분 이상)
    const videoDuration = format === 'short' ? 'short' : 'medium';

    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        key: this.apiKey,
        part: 'snippet',
        q: keyword,
        type: 'video',
        videoDuration,
        maxResults,
        order: 'viewCount',
        relevanceLanguage: 'ko',
        regionCode: 'KR',
      },
    });

    return response.data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    }));
  }

  /**
   * 영상 상세 정보 조회 (조회수, 좋아요, 댓글수, 길이)
   */
  async getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]> {
    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        key: this.apiKey,
        part: 'snippet,statistics,contentDetails',
        id: videoIds.join(','),
      },
    });

    return response.data.items.map((item: any) => ({
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      duration: item.contentDetails.duration,
      viewCount: parseInt(item.statistics.viewCount || '0'),
      likeCount: parseInt(item.statistics.likeCount || '0'),
      commentCount: parseInt(item.statistics.commentCount || '0'),
      thumbnailUrl: item.snippet.thumbnails.maxres?.url ||
                    item.snippet.thumbnails.high?.url ||
                    item.snippet.thumbnails.default?.url,
    }));
  }

  /**
   * 채널 정보 조회 (구독자수)
   */
  async getChannelDetails(channelIds: string[]): Promise<YouTubeChannelDetails[]> {
    const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        key: this.apiKey,
        part: 'snippet,statistics',
        id: channelIds.join(','),
      },
    });

    return response.data.items.map((item: any) => ({
      channelId: item.id,
      title: item.snippet.title,
      subscriberCount: parseInt(item.statistics.subscriberCount || '0'),
      videoCount: parseInt(item.statistics.videoCount || '0'),
    }));
  }

  /**
   * 댓글 수집
   * PRD 4단계: 숏폼 50~100개, 롱폼 100~200개
   */
  async getComments(videoId: string, format: ContentFormat = 'long'): Promise<string[]> {
    const maxResults = format === 'short' ? 100 : 200;
    const comments: string[] = [];
    let nextPageToken: string | undefined;

    try {
      while (comments.length < maxResults) {
        const response = await axios.get(`${YOUTUBE_API_BASE}/commentThreads`, {
          params: {
            key: this.apiKey,
            part: 'snippet',
            videoId,
            maxResults: 100,
            order: 'relevance',
            textFormat: 'plainText',
            pageToken: nextPageToken,
          },
        });

        const items = response.data.items || [];
        for (const item of items) {
          const text = item.snippet.topLevelComment.snippet.textDisplay;
          comments.push(text);
          if (comments.length >= maxResults) break;
        }

        nextPageToken = response.data.nextPageToken;
        if (!nextPageToken) break;
      }
    } catch (error) {
      // 댓글이 비활성화된 경우 등 에러 처리
      console.error('Error fetching comments:', error);
    }

    return comments;
  }

  /**
   * 영상 자막(캡션) 가져오기
   */
  async getCaptions(videoId: string): Promise<string | null> {
    try {
      // YouTube API로 자막 목록 조회
      const response = await axios.get(`${YOUTUBE_API_BASE}/captions`, {
        params: {
          key: this.apiKey,
          part: 'snippet',
          videoId,
        },
      });

      // 한국어 자막 우선, 없으면 영어
      const captions = response.data.items || [];
      const koreanCaption = captions.find((c: any) =>
        c.snippet.language === 'ko' || c.snippet.language === 'ko-KR'
      );
      const englishCaption = captions.find((c: any) =>
        c.snippet.language === 'en' || c.snippet.language === 'en-US'
      );

      const targetCaption = koreanCaption || englishCaption || captions[0];

      if (!targetCaption) return null;

      // 자막 다운로드는 OAuth 인증이 필요하므로, 별도 처리 필요
      // 여기서는 자막 ID만 반환
      return targetCaption.id;
    } catch (error) {
      console.error('Error fetching captions:', error);
      return null;
    }
  }

  /**
   * ISO 8601 duration을 초로 변환
   * PT1H2M10S -> 3730
   */
  static parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * 초를 MM:SS 또는 HH:MM:SS 형식으로 변환
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
}

/**
 * PRD 2단계: 터짐 지수 계산 및 5단계 분류
 * 터짐 지수 = (조회수 / 구독자수) × 시간 가중치
 */
export function calculateViralScore(
  viewCount: number,
  subscriberCount: number,
  publishedAt: Date | string,
  format: ContentFormat = 'long'
): ViralScoreResult {
  const published = new Date(publishedAt);
  const now = new Date();
  const daysSinceUpload = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));

  // 시간 가중치 계산 (숏폼은 더 급격한 감쇠)
  let timeWeight = 1.0;

  if (format === 'short') {
    // 숏폼: 3일 이내 1.5배, 7일 이내 1.2배
    if (daysSinceUpload <= 3) {
      timeWeight = 1.5;
    } else if (daysSinceUpload <= 7) {
      timeWeight = 1.2;
    } else if (daysSinceUpload <= 14) {
      timeWeight = 1.0;
    } else if (daysSinceUpload <= 30) {
      timeWeight = 0.8;
    } else {
      timeWeight = 0.5;
    }
  } else {
    // 롱폼: 7일 이내 1.5배, 30일 이내 1.2배
    if (daysSinceUpload <= 7) {
      timeWeight = 1.5;
    } else if (daysSinceUpload <= 30) {
      timeWeight = 1.2;
    } else if (daysSinceUpload <= 90) {
      timeWeight = 1.0;
    } else if (daysSinceUpload <= 180) {
      timeWeight = 0.8;
    } else {
      timeWeight = 0.6;
    }
  }

  // 구독자가 0인 경우 처리
  const safeSubscriberCount = Math.max(subscriberCount, 1);
  const score = (viewCount / safeSubscriberCount) * timeWeight;

  // 등급 분류
  const grade = getViralGrade(score);

  return {
    score: Math.round(score * 100) / 100,
    grade,
    timeWeight,
  };
}

/**
 * 터짐 지수를 등급으로 변환
 */
export function getViralGrade(score: number): ViralGrade {
  if (score >= 10) return 'S';  // 폭발
  if (score >= 5) return 'A';   // 대성공
  if (score >= 2) return 'B';   // 성공
  if (score >= 0.5) return 'C'; // 평균
  return 'D';                   // 저조
}

/**
 * 등급별 색상 반환
 */
export function getGradeColor(grade: ViralGrade): string {
  switch (grade) {
    case 'S': return '#FF4444'; // 빨강
    case 'A': return '#FF8800'; // 주황
    case 'B': return '#FFCC00'; // 노랑
    case 'C': return '#44BB44'; // 초록
    case 'D': return '#888888'; // 회색
  }
}

/**
 * 등급별 라벨 반환
 */
export function getGradeLabel(grade: ViralGrade): string {
  switch (grade) {
    case 'S': return '폭발';
    case 'A': return '대성공';
    case 'B': return '성공';
    case 'C': return '평균';
    case 'D': return '저조';
  }
}

export default YouTubeService;
