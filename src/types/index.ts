// Content Format Types
export type ContentFormat = 'short' | 'long';
export type ViralGrade = 'S' | 'A' | 'B' | 'C' | 'D';
export type ProjectStatus = 'searching' | 'analyzing' | 'generating' | 'completed' | 'failed';
export type AssetType = 'image' | 'voice' | 'subtitle' | 'video' | 'report';
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'published' | 'failed';
export type PrivacyStatus = 'public' | 'unlisted' | 'private';
export type ReportType = 'comments' | 'script' | 'assets' | 'full';

// Project
export interface Project {
  id: number;
  projectName: string;
  keyword: string;
  contentFormat: ContentFormat;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Video
export interface SelectedVideo {
  id: number;
  projectId: number;
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  subscriberCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  durationSeconds: number;
  publishedAt: Date;
  thumbnailUrl: string;
  viralScore: number;
  viralGrade: ViralGrade;
  createdAt: Date;
}

// Comment Analysis
export interface CommentAnalysis {
  id: number;
  videoId: number;
  totalCommentsAnalyzed: number;
  positiveCount: number;
  negativeCount: number;
  positiveRatio: number;
  positiveSummary: string;
  positiveKeywords: string[];
  negativeSummary: string;
  negativeKeywords: string[];
  improvementSuggestions: string;
  rawCommentsJson: string;
  analysisModel: string;
  analyzedAt: Date;
}

// Content Summary
export interface ContentSummary {
  id: number;
  videoId: number;
  originalTranscript: string;
  oneLineSummary: string;
  keyPoints: string[];
  detailedSummary: string;
  contextBackground: string;
  summaryLevel: '2-step' | '4-step';
  createdAt: Date;
}

// Generated Script
export interface GeneratedScript {
  id: number;
  videoId: number;
  scriptPurpose: string;
  targetAudience: string;
  expectedDurationSeconds: number;
  scriptStructure: Record<string, string>;
  fullScript: string;
  hookText: string;
  introText: string;
  bodyText: string;
  conclusionText: string;
  contentFormat: ContentFormat;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Generated Asset
export interface GeneratedAsset {
  id: number;
  scriptId: number;
  assetType: AssetType;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  fileUrl?: string;

  // Image specific
  imagePrompt?: string;
  imageResolution?: string;
  imageSequence?: number;

  // Voice specific
  voiceDurationSeconds?: number;
  ttsProvider?: string;
  ttsVoiceId?: string;
  ttsSpeed?: number;

  // Subtitle specific
  subtitleFormat?: 'srt' | 'vtt' | 'ass';
  subtitleLineCount?: number;

  // Video specific
  videoResolution?: string;
  videoDurationSeconds?: number;
  videoCodec?: string;
  videoFps?: number;

  generationStatus: GenerationStatus;
  errorMessage?: string;
  createdAt: Date;
}

// Upload History
export interface UploadHistory {
  id: number;
  assetId: number;
  youtubeVideoId?: string;
  uploadTitle: string;
  uploadDescription?: string;
  uploadTags: string[];
  uploadCategoryId?: number;
  privacyStatus: PrivacyStatus;
  scheduledPublishAt?: Date;
  actualPublishedAt?: Date;
  uploadStatus: UploadStatus;
  thumbnailUrl?: string;
  errorMessage?: string;
  createdAt: Date;
}

// Full Report
export interface FullReport {
  id: number;
  projectId: number;
  videoId: number;
  reportType: ReportType;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  markdownContent: string;
  generatedAt: Date;
}

// Content Config (PRD 설정 데이터 구조)
export interface ContentConfig {
  format: ContentFormat;
  video: {
    aspectRatio: string;
    resolution: string;
    maxDuration: number;
  };
  script: {
    maxLength: number;
    structure: string[];
  };
  images: {
    count: number;
    style: 'closeup' | 'mixed';
  };
  tts: {
    speed: number;
    tone: 'energetic' | 'calm';
  };
  subtitles: {
    position: 'center' | 'bottom';
    fontSize: number;
  };
}

// Viral Score Calculation
export interface ViralScoreResult {
  score: number;
  grade: ViralGrade;
  timeWeight: number;
}

// YouTube API Response Types
export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface YouTubeVideoDetails {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
}

export interface YouTubeChannelDetails {
  channelId: string;
  title: string;
  subscriberCount: number;
  videoCount: number;
}

// Claude API Types
export interface ClaudeAnalysisRequest {
  comments: string[];
  format: ContentFormat;
}

export interface ClaudeAnalysisResponse {
  positiveCount: number;
  negativeCount: number;
  positiveSummary: string;
  negativeSummary: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
  improvementSuggestions: string;
}

export interface ClaudeScriptRequest {
  summary: ContentSummary;
  commentAnalysis: CommentAnalysis;
  format: ContentFormat;
  targetAudience?: string;
}

export interface ClaudeScriptResponse {
  fullScript: string;
  hook: string;
  intro: string;
  body: string;
  conclusion: string;
  estimatedDuration: number;
}

// Platform Types (Multi-platform support)
export type PlatformCode = 'youtube_shorts' | 'youtube_long' | 'tiktok' | 'instagram_reels';

export interface Platform {
  id: number;
  platformCode: PlatformCode;
  platformName: string;
  maxDurationSeconds: number;
  maxFileSizeMb: number;
  aspectRatio: string;
  resolution: string;
  apiEnabled: boolean;
}

// A/B Test Types
export type ABTestType = 'thumbnail' | 'title' | 'description' | 'combined';
export type ABTestStatus = 'draft' | 'running' | 'completed' | 'cancelled';

export interface ABTest {
  id: number;
  projectId: number;
  testName: string;
  testType: ABTestType;
  status: ABTestStatus;
  startDate?: Date;
  endDate?: Date;
  minViewsPerVariant: number;
  confidenceLevel: number;
  winnerVariantId?: number;
  statisticalSignificance?: number;
  createdAt: Date;
}

export interface ABTestVariant {
  id: number;
  testId: number;
  variantName: string;
  isControl: boolean;
  title?: string;
  description?: string;
  thumbnailPath?: string;
  youtubeVideoId?: string;
  views: number;
  watchTimeHours: number;
  likes: number;
  comments: number;
  ctr: number;
  avgViewDurationSeconds: number;
  engagementScore: number;
  lastMetricsUpdate?: Date;
  createdAt: Date;
}

// Workflow Types
export type WorkflowStatus = 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'completed';
export type ReviewAction = 'approve' | 'reject' | 'request_changes' | 'comment';
export type TeamRole = 'admin' | 'creator' | 'reviewer' | 'approver' | 'viewer';

export interface WorkflowStage {
  id: number;
  stageCode: string;
  stageName: string;
  stageOrder: number;
  requiresApproval: boolean;
  autoAdvance: boolean;
}

export interface ProjectWorkflow {
  id: number;
  projectId: number;
  currentStageId: number;
  creatorId?: string;
  assigneeId?: string;
  reviewerId?: string;
  approverId?: string;
  dueDate?: Date;
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Template Types
export type TemplateType = 'script' | 'image_prompt' | 'video_style' | 'thumbnail';

export interface Template {
  id: number;
  templateName: string;
  templateType: TemplateType;
  category?: string;
  contentFormat: ContentFormat | 'both';
  templateContent: string;
  templateVariables: string[];
  description?: string;
  exampleOutput?: string;
  previewImageUrl?: string;
  useCount: number;
  avgPerformanceScore?: number;
  isPublic: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Utility function to get content config
export function getContentConfig(format: ContentFormat): ContentConfig {
  const isShort = format === 'short';

  return {
    format,
    video: {
      aspectRatio: isShort ? '9:16' : '16:9',
      resolution: isShort ? '1080x1920' : '1920x1080',
      maxDuration: isShort ? 60 : 900,
    },
    script: {
      maxLength: isShort ? 300 : 3000,
      structure: isShort
        ? ['hook', 'core', 'closer']
        : ['intro', 'body', 'conclusion'],
    },
    images: {
      count: isShort ? 4 : 8,
      style: isShort ? 'closeup' : 'mixed',
    },
    tts: {
      speed: isShort ? 1.15 : 1.0,
      tone: isShort ? 'energetic' : 'calm',
    },
    subtitles: {
      position: isShort ? 'center' : 'bottom',
      fontSize: isShort ? 56 : 36,
    },
  };
}
