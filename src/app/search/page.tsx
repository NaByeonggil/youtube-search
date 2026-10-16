'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  subscriberCount: number;
  durationFormatted: string;
  viralScore: number;
  viralGrade: 'S' | 'A' | 'B' | 'C' | 'D';
}

interface SearchMeta {
  keyword: string;
  format: string;
  totalResults: number;
  gradeDistribution: Record<string, number>;
}

interface ContentIdeaItem {
  id: number;
  title: string;
  description: string;
  targetAudience: string;
  estimatedViralScore: '상' | '중' | '하';
  reasoning: string;
  suggestedFormat: '숏폼' | '롱폼';
}

interface ContentIdeasResult {
  viewerQuestions: string[];
  painPoints: string[];
  contentRequests: string[];
  relatedTopics: string[];
  hotTopics: string[];
  contentIdeas: ContentIdeaItem[];
}

interface ScriptSection {
  order: number;
  title: string;
  duration: string;
  keyPoints: string[];
  scriptHint: string;
}

interface ScriptOutlineResult {
  title: string;
  hook: string;
  estimatedDuration: string;
  sections: ScriptSection[];
  callToAction: string;
  thumbnailIdea: string;
  tags: string[];
}

interface BlogSection {
  heading: string;
  content: string;
}

interface BlogPostResult {
  title: string;
  metaDescription: string;
  introduction: string;
  sections: BlogSection[];
  conclusion: string;
  tags: string[];
  estimatedReadTime: string;
}

type WorkflowStep = 'idle' | 'collecting' | 'analyzing' | 'ideas' | 'scriptOptions' | 'outline' | 'blogOptions' | 'blog';

const gradeColors: Record<string, string> = {
  S: 'bg-red-500 text-white',
  A: 'bg-orange-500 text-white',
  B: 'bg-yellow-500 text-black',
  C: 'bg-green-500 text-white',
  D: 'bg-gray-500 text-white',
};

const gradeLabels: Record<string, string> = {
  S: '폭발',
  A: '대성공',
  B: '성공',
  C: '평균',
  D: '저조',
};

const viralScoreColors: Record<string, string> = {
  상: 'text-green-400',
  중: 'text-yellow-400',
  하: 'text-red-400',
};

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default function SearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [format, setFormat] = useState<'long' | 'short'>('long');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Content Ideas Workflow State
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [contentIdeas, setContentIdeas] = useState<ContentIdeasResult | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<ContentIdeaItem | null>(null);
  const [scriptOutline, setScriptOutline] = useState<ScriptOutlineResult | null>(null);
  const [blogPost, setBlogPost] = useState<BlogPostResult | null>(null);
  const [blogTarget, setBlogTarget] = useState('');
  const [blogTone, setBlogTone] = useState('');
  const [scriptTarget, setScriptTarget] = useState('');
  const [scriptTone, setScriptTone] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const [blogSaveResult, setBlogSaveResult] = useState<{
    success: boolean;
    message: string;
    blogId?: number;
  } | null>(null);

  // 콘텐츠 아이디어 히스토리에서 "이어서 작업하기"로 넘어온 경우 워크플로우 모달 복원
  useEffect(() => {
    const stored = sessionStorage.getItem('resumeContentIdeaWorkflow');
    if (!stored) return;
    sessionStorage.removeItem('resumeContentIdeaWorkflow');

    try {
      const data = JSON.parse(stored);
      const source = data.sourceVideo || {};
      const ideasList: ContentIdeaItem[] = data.contentIdeasList || [];

      setFormat(data.format === 'short' ? 'short' : 'long');
      setSelectedVideo({
        videoId: source.videoId || '',
        title: source.title || '',
        channelTitle: source.channelTitle || '',
        publishedAt: '',
        thumbnailUrl: source.thumbnailUrl || '',
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        subscriberCount: 0,
        durationFormatted: '',
        viralScore: 0,
        viralGrade: 'C',
      });
      setContentIdeas({
        viewerQuestions: data.contentIdeas?.viewerQuestions || [],
        painPoints: data.contentIdeas?.painPoints || [],
        contentRequests: data.contentIdeas?.contentRequests || [],
        relatedTopics: data.contentIdeas?.relatedTopics || [],
        hotTopics: data.contentIdeas?.hotTopics || [],
        contentIdeas: ideasList,
      });
      setScriptOutline(null);
      setBlogPost(null);
      setWorkflowError('');
      setShowIdeaModal(true);

      const idea = data.selectedIdea;
      if (idea && idea.title) {
        const matched = ideasList.find((i) => i.title === idea.title);
        handleShowScriptOptions(matched || { id: 0, ...idea });
      } else {
        setWorkflowStep('ideas');
      }
    } catch (e) {
      console.error('Failed to restore content idea workflow:', e);
    }
  }, []);

  const handleAnalyze = async (video: VideoResult) => {
    setAnalyzing(video.videoId);

    // Store selected video info in sessionStorage for analysis page
    sessionStorage.setItem('selectedVideo', JSON.stringify({
      videoId: video.videoId,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      viewCount: video.viewCount,
      subscriberCount: video.subscriberCount,
      viralScore: video.viralScore,
      viralGrade: video.viralGrade,
      format: format,
    }));

    // Navigate to analysis page with video ID
    router.push(`/analysis?videoId=${video.videoId}`);
  };

  const handleContentIdeas = async (video: VideoResult) => {
    setSelectedVideo(video);
    setShowIdeaModal(true);
    setWorkflowStep('collecting');
    setWorkflowError('');
    setContentIdeas(null);
    setSelectedIdea(null);
    setScriptOutline(null);
    setBlogPost(null);

    try {
      // Step 1: Analyze content ideas from comments
      setWorkflowStep('analyzing');
      const response = await fetch('/api/analyze/content-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.videoId,
          videoTitle: video.title,
          format: format,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setContentIdeas(data.data);
        setWorkflowStep('ideas');

        // 분석 완료 시 바로 워크플로우 저장 (콘텐츠 아이디어 리스트에 표시되도록)
        try {
          await fetch('/api/content-ideas/workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceVideo: {
                videoId: video.videoId,
                title: video.title,
                channelTitle: video.channelTitle,
                thumbnailUrl: video.thumbnailUrl,
              },
              contentIdeas: {
                viewerQuestions: data.data.viewerQuestions,
                painPoints: data.data.painPoints,
                contentRequests: data.data.contentRequests,
                relatedTopics: data.data.relatedTopics,
                hotTopics: data.data.hotTopics,
                totalCommentsAnalyzed: data.data.totalCommentsAnalyzed || 0,
              },
              contentIdeasList: data.data.contentIdeas,
              format: format,
            }),
          });
          console.log('콘텐츠 아이디어가 히스토리에 저장되었습니다.');
        } catch (saveErr) {
          console.error('워크플로우 저장 실패:', saveErr);
        }
      } else {
        setWorkflowError(data.error || '콘텐츠 아이디어 분석에 실패했습니다.');
        setWorkflowStep('idle');
      }
    } catch (err) {
      setWorkflowError('분석 중 오류가 발생했습니다.');
      setWorkflowStep('idle');
    }
  };

  const handleShowScriptOptions = (idea: ContentIdeaItem) => {
    setSelectedIdea(idea);
    setScriptTarget(idea.targetAudience || '');
    setScriptTone('친근하고 전문적인');
    setWorkflowStep('scriptOptions');
    setWorkflowError('');
  };

  const handleSelectIdea = async () => {
    if (!selectedIdea) return;

    setWorkflowStep('analyzing');
    setWorkflowError('');

    try {
      const response = await fetch('/api/scripts/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentIdea: selectedIdea,
          format: selectedIdea.suggestedFormat === '숏폼' ? 'short' : 'long',
          customTarget: scriptTarget || undefined,
          toneAndManner: scriptTone || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setScriptOutline(data.data.outline);
        setWorkflowStep('outline');
      } else {
        setWorkflowError(data.error || '대본 목차 생성에 실패했습니다.');
        setWorkflowStep('scriptOptions');
      }
    } catch (err) {
      setWorkflowError('목차 생성 중 오류가 발생했습니다.');
      setWorkflowStep('scriptOptions');
    }
  };

  const handleGenerateScript = async () => {
    if (!scriptOutline || !selectedIdea || !selectedVideo) return;

    const workflowFormat = selectedIdea.suggestedFormat === '숏폼' ? 'short' : 'long';

    // Save workflow to database
    try {
      const response = await fetch('/api/content-ideas/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceVideo: {
            videoId: selectedVideo.videoId,
            title: selectedVideo.title,
            channelTitle: selectedVideo.channelTitle,
            thumbnailUrl: selectedVideo.thumbnailUrl,
          },
          contentIdeas: contentIdeas ? {
            viewerQuestions: contentIdeas.viewerQuestions,
            painPoints: contentIdeas.painPoints,
            contentRequests: contentIdeas.contentRequests,
            relatedTopics: contentIdeas.relatedTopics,
            hotTopics: contentIdeas.hotTopics,
          } : null,
          contentIdeasList: contentIdeas?.contentIdeas || [],
          selectedIdea: {
            title: selectedIdea.title,
            description: selectedIdea.description,
            targetAudience: selectedIdea.targetAudience,
            estimatedViralScore: selectedIdea.estimatedViralScore,
            suggestedFormat: selectedIdea.suggestedFormat,
            reasoning: selectedIdea.reasoning,
          },
          outline: {
            title: scriptOutline.title,
            hook: scriptOutline.hook,
            estimatedDuration: scriptOutline.estimatedDuration,
            sections: scriptOutline.sections,
            callToAction: scriptOutline.callToAction,
            thumbnailIdea: scriptOutline.thumbnailIdea,
            tags: scriptOutline.tags,
          },
          format: workflowFormat,
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('Workflow saved with ID:', data.data.id);
      }
    } catch (err) {
      console.error('Failed to save workflow:', err);
    }

    // Store data for script generation page
    sessionStorage.setItem('scriptOutline', JSON.stringify({
      outline: scriptOutline,
      contentIdea: selectedIdea,
      sourceVideo: selectedVideo,
      format: workflowFormat,
    }));

    // Navigate to script generation page
    router.push('/scripts');
  };

  const handleShowBlogOptions = (idea: ContentIdeaItem) => {
    setSelectedIdea(idea);
    setBlogTarget(idea.targetAudience || '');
    setBlogTone('친근하고 전문적인');
    setWorkflowStep('blogOptions');
    setWorkflowError('');
  };

  const handleGenerateBlog = async () => {
    if (!selectedIdea) return;

    setWorkflowStep('analyzing');
    setWorkflowError('');
    setBlogSaveResult(null);

    try {
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentIdea: selectedIdea,
          customTarget: blogTarget || undefined,
          toneAndManner: blogTone || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBlogPost(data.data.blogPost);
        setWorkflowStep('blog');

        // 콘텐츠 아이디어 워크플로우 저장
        try {
          const workflowFormat = selectedIdea.suggestedFormat === '숏폼' ? 'short' : 'long';
          const workflowRes = await fetch('/api/content-ideas/workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceVideo: selectedVideo ? {
                videoId: selectedVideo.videoId,
                title: selectedVideo.title,
                channelTitle: selectedVideo.channelTitle,
                thumbnailUrl: selectedVideo.thumbnailUrl,
              } : null,
              contentIdeas: contentIdeas ? {
                viewerQuestions: contentIdeas.viewerQuestions,
                painPoints: contentIdeas.painPoints,
                contentRequests: contentIdeas.contentRequests,
                relatedTopics: contentIdeas.relatedTopics,
                hotTopics: contentIdeas.hotTopics,
              } : null,
              selectedIdea: {
                title: selectedIdea.title,
                description: selectedIdea.description,
                targetAudience: selectedIdea.targetAudience,
                estimatedViralScore: selectedIdea.estimatedViralScore,
                suggestedFormat: selectedIdea.suggestedFormat,
                reasoning: selectedIdea.reasoning,
              },
              format: workflowFormat,
              generatedBlog: data.data.blogPost,
            }),
          });
          const workflowData = await workflowRes.json();
          if (workflowData.success) {
            console.log('Workflow saved with ID:', workflowData.data.id);
          }
        } catch (workflowErr) {
          console.error('Failed to save workflow:', workflowErr);
        }

        // 블로그 DB 저장
        try {
          const saveRes = await fetch('/api/blog/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceVideo: selectedVideo ? {
                videoId: selectedVideo.videoId,
                title: selectedVideo.title,
                channelName: selectedVideo.channelTitle,
              } : undefined,
              idea: {
                title: selectedIdea.title,
                description: selectedIdea.description,
                targetAudience: selectedIdea.targetAudience,
              },
              blogPost: data.data.blogPost,
              options: {
                customTarget: blogTarget || undefined,
                toneAndManner: blogTone || undefined,
              },
            }),
          });
          const saveData = await saveRes.json();
          if (saveData.success) {
            setBlogSaveResult({
              success: true,
              message: '블로그가 DB에 저장되었습니다!',
              blogId: saveData.data?.id,
            });
          } else {
            setBlogSaveResult({
              success: false,
              message: saveData.error || '블로그 저장에 실패했습니다.',
            });
          }
        } catch (saveError) {
          console.error('블로그 저장 오류:', saveError);
          setBlogSaveResult({
            success: false,
            message: '블로그 저장 중 오류가 발생했습니다.',
          });
        }
      } else {
        setWorkflowError(data.error || '블로그 생성에 실패했습니다.');
        setWorkflowStep('blogOptions');
      }
    } catch (err) {
      setWorkflowError('블로그 생성 중 오류가 발생했습니다.');
      setWorkflowStep('blogOptions');
    }
  };

  const handleCopyBlog = () => {
    if (!blogPost) return;

    const fullText = `# ${blogPost.title}

${blogPost.introduction}

${blogPost.sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n')}

${blogPost.conclusion}

---
태그: ${blogPost.tags.map(t => `#${t}`).join(' ')}
`;

    navigator.clipboard.writeText(fullText);
    alert('블로그 내용이 클립보드에 복사되었습니다!');
  };

  const closeModal = () => {
    setShowIdeaModal(false);
    setWorkflowStep('idle');
    setSelectedVideo(null);
    setContentIdeas(null);
    setSelectedIdea(null);
    setScriptOutline(null);
    setBlogPost(null);
    setBlogTarget('');
    setBlogTone('');
    setScriptTarget('');
    setScriptTone('');
    setWorkflowError('');
    setBlogSaveResult(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);
    setMeta(null);

    try {
      const res = await fetch(`/api/youtube/search?keyword=${encodeURIComponent(keyword)}&format=${format}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.data);
        setMeta(data.meta);
      } else {
        setError(data.error || '검색에 실패했습니다.');
      }
    } catch (err) {
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">키워드 검색</h1>
        <p className="text-slate-400 mt-1">YouTube 영상을 검색하고 터짐 지수를 분석합니다.</p>
      </div>

      {/* 검색 폼 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* 포맷 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">콘텐츠 포맷</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setFormat('long')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  format === 'long'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <div className="text-lg mb-1">📺</div>
                <div>롱폼</div>
                <div className="text-xs opacity-70">16:9 | 5~15분</div>
              </button>
              <button
                type="button"
                onClick={() => setFormat('short')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  format === 'short'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <div className="text-lg mb-1">📱</div>
                <div>숏폼</div>
                <div className="text-xs opacity-70">9:16 | 30~60초</div>
              </button>
            </div>
          </div>

          {/* 키워드 입력 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">검색 키워드</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="검색할 키워드를 입력하세요"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={loading || !keyword.trim()}
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '검색 중...' : '검색'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* 검색 결과 */}
      {!loading && meta && (
        <>
          {/* 등급별 통계 */}
          <div className="grid grid-cols-6 gap-3 mb-6">
            <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
              <div className="text-2xl font-bold text-white">{meta.totalResults}</div>
              <div className="text-xs text-slate-400">전체</div>
            </div>
            {(['S', 'A', 'B', 'C', 'D'] as const).map((grade) => (
              <div key={grade} className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
                <div className={`text-2xl font-bold ${grade === 'S' ? 'text-red-400' : grade === 'A' ? 'text-orange-400' : grade === 'B' ? 'text-yellow-400' : grade === 'C' ? 'text-green-400' : 'text-gray-400'}`}>
                  {meta.gradeDistribution[grade] || 0}
                </div>
                <div className="text-xs text-slate-400">{grade}등급</div>
              </div>
            ))}
          </div>

          {/* 결과 헤더 및 뷰 토글 */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                검색 결과 ({results.length}개)
              </h2>
              <div className="flex items-center space-x-1 bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                    viewMode === 'card'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span>카드</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                    viewMode === 'table'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>테이블</span>
                </button>
              </div>
            </div>

            {/* 카드뷰 */}
            {viewMode === 'card' && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.map((video) => (
                  <div
                    key={video.videoId}
                    className="bg-slate-700/50 rounded-xl overflow-hidden border border-slate-600 hover:border-purple-500/50 transition-colors group"
                  >
                    {/* 썸네일 */}
                    <div className="relative aspect-video">
                      <img
                        src={video.thumbnailUrl || '/placeholder-video.svg'}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${gradeColors[video.viralGrade]}`}>
                          {video.viralGrade} {gradeLabels[video.viralGrade]}
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs text-white">
                        {video.durationFormatted}
                      </div>
                    </div>

                    {/* 콘텐츠 */}
                    <div className="p-4">
                      <a
                        href={`https://youtube.com/watch?v=${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-white hover:text-purple-400 line-clamp-2 mb-2 block"
                      >
                        {video.title}
                      </a>
                      <p className="text-xs text-slate-400 mb-3">{video.channelTitle}</p>

                      {/* 통계 */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className="bg-slate-800 rounded-lg p-2 text-center">
                          <div className="text-white font-semibold">{formatNumber(video.viewCount)}</div>
                          <div className="text-slate-500">조회수</div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-2 text-center">
                          <div className="text-slate-300 font-semibold">{formatNumber(video.subscriberCount)}</div>
                          <div className="text-slate-500">구독자</div>
                        </div>
                      </div>

                      {/* 터짐 지수 */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400">터짐 지수</span>
                        <span className="text-sm font-bold text-purple-400">{video.viralScore.toFixed(2)}</span>
                      </div>

                      {/* 버튼들 */}
                      <div className="space-y-2">
                        <button
                          onClick={() => handleAnalyze(video)}
                          disabled={analyzing === video.videoId}
                          className="w-full py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {analyzing === video.videoId ? '이동 중...' : '분석하기'}
                        </button>
                        <button
                          onClick={() => handleContentIdeas(video)}
                          className="w-full py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-1"
                        >
                          <span>💡</span>
                          <span>소재 추천받기</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 테이블뷰 */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr className="text-left text-sm text-slate-400">
                      <th className="px-4 py-3 font-medium">영상</th>
                      <th className="px-4 py-3 font-medium text-right">조회수</th>
                      <th className="px-4 py-3 font-medium text-right">구독자</th>
                      <th className="px-4 py-3 font-medium text-center">터짐 지수</th>
                      <th className="px-4 py-3 font-medium text-center">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {results.map((video) => (
                      <tr key={video.videoId} className="hover:bg-slate-700/30">
                        <td className="px-4 py-4">
                          <div className="flex items-start space-x-3">
                            <img
                              src={video.thumbnailUrl || '/placeholder-video.svg'}
                              alt={video.title}
                              className="w-32 h-18 object-cover rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                              <a
                                href={`https://youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-white hover:text-purple-400 line-clamp-2"
                              >
                                {video.title}
                              </a>
                              <p className="text-xs text-slate-400 mt-1">{video.channelTitle}</p>
                              <p className="text-xs text-slate-500">{video.durationFormatted}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-white font-medium">{formatNumber(video.viewCount)}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-slate-300">{formatNumber(video.subscriberCount)}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${gradeColors[video.viralGrade]}`}>
                              {video.viralGrade}
                            </span>
                            <span className="text-xs text-slate-400 mt-1">{video.viralScore.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => handleAnalyze(video)}
                              disabled={analyzing === video.videoId}
                              className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {analyzing === video.videoId ? '이동 중...' : '분석하기'}
                            </button>
                            <button
                              onClick={() => handleContentIdeas(video)}
                              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                              💡 소재 추천
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 검색 전 안내 */}
      {!loading && !meta && !error && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">키워드를 입력하세요</h3>
          <p className="text-slate-400">
            YouTube 영상을 검색하고 터짐 지수(조회수/구독자)를 분석합니다.
          </p>
        </div>
      )}

      {/* 콘텐츠 아이디어 모달 */}
      {showIdeaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">💡 콘텐츠 소재 추천</h2>
                {selectedVideo && (
                  <p className="text-sm text-slate-400 mt-1 line-clamp-1">{selectedVideo.title}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 모달 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 에러 메시지 */}
              {workflowError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
                  <p className="text-red-400">{workflowError}</p>
                </div>
              )}

              {/* 로딩 상태 */}
              {(workflowStep === 'collecting' || workflowStep === 'analyzing') && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                  <p className="text-white font-medium">
                    {workflowStep === 'collecting' ? '댓글 수집 중...' : '콘텐츠 아이디어 분석 중...'}
                  </p>
                  <p className="text-slate-400 text-sm mt-2">잠시만 기다려주세요</p>
                </div>
              )}

              {/* 콘텐츠 아이디어 목록 */}
              {workflowStep === 'ideas' && contentIdeas && (
                <div className="space-y-6">
                  {/* 분석 결과 요약 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-400">{contentIdeas.viewerQuestions.length}</div>
                      <div className="text-xs text-slate-400">시청자 질문</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-400">{contentIdeas.painPoints.length}</div>
                      <div className="text-xs text-slate-400">Pain Points</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-emerald-400">{contentIdeas.contentRequests.length}</div>
                      <div className="text-xs text-slate-400">콘텐츠 요청</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-yellow-400">{contentIdeas.hotTopics.length}</div>
                      <div className="text-xs text-slate-400">인기 토픽</div>
                    </div>
                  </div>

                  {/* 키워드 태그들 */}
                  {contentIdeas.hotTopics.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-2">🔥 인기 토픽</h3>
                      <div className="flex flex-wrap gap-2">
                        {contentIdeas.hotTopics.map((topic, idx) => (
                          <span key={idx} className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 콘텐츠 아이디어 카드들 */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">추천 콘텐츠 아이디어</h3>
                    <div className="space-y-4">
                      {contentIdeas.contentIdeas.map((idea) => (
                        <div
                          key={idea.id}
                          className="bg-slate-700/50 rounded-xl p-5 border border-slate-600 hover:border-purple-500/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-lg font-semibold text-white">{idea.title}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm font-bold ${viralScoreColors[idea.estimatedViralScore]}`}>
                                {idea.estimatedViralScore === '상' ? '🔥 높음' : idea.estimatedViralScore === '중' ? '⚡ 보통' : '💤 낮음'}
                              </span>
                              <span className="px-2 py-1 bg-slate-600 rounded text-xs text-slate-300">
                                {idea.suggestedFormat}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-300 text-sm mb-3">{idea.description}</p>
                          <div className="flex items-center justify-between text-xs mb-3">
                            <span className="text-slate-400">타겟: {idea.targetAudience}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowScriptOptions(idea);
                              }}
                              className="flex-1 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-1"
                            >
                              <span>📝</span>
                              <span>대본 만들기</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowBlogOptions(idea);
                              }}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                            >
                              <span>✏️</span>
                              <span>블로그 작성</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-3 italic">💡 {idea.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 대본 옵션 입력 */}
              {workflowStep === 'scriptOptions' && selectedIdea && (
                <div className="space-y-6">
                  {/* 뒤로가기 */}
                  <button
                    onClick={() => setWorkflowStep('ideas')}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm">아이디어 목록으로</span>
                  </button>

                  {/* 선택된 아이디어 정보 */}
                  <div className="bg-gradient-to-r from-emerald-600/20 to-purple-600/20 rounded-xl p-6 border border-emerald-500/30">
                    <h3 className="text-xl font-bold text-white mb-2">📝 대본 작성 설정</h3>
                    <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
                      <div className="text-xs text-slate-400 mb-1">선택한 아이디어</div>
                      <p className="text-white font-medium">{selectedIdea.title}</p>
                      <p className="text-slate-400 text-sm mt-1">{selectedIdea.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="px-2 py-1 bg-slate-600 rounded text-xs text-slate-300">
                          {selectedIdea.suggestedFormat}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 입력 필드들 */}
                  <div className="space-y-4">
                    {/* 타겟 시청자 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        🎯 타겟 시청자
                      </label>
                      <input
                        type="text"
                        value={scriptTarget}
                        onChange={(e) => setScriptTarget(e.target.value)}
                        placeholder="예: 20대 대학생, 직장인 초보, 자취생"
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        영상의 주요 시청자층을 명시해주세요
                      </p>
                    </div>

                    {/* 톤앤매너 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        🎨 톤앤매너
                      </label>
                      <input
                        type="text"
                        value={scriptTone}
                        onChange={(e) => setScriptTone(e.target.value)}
                        placeholder="예: 친근하고 유머러스한, 차분하고 신뢰감 있는"
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        영상의 어조와 분위기를 설정해주세요
                      </p>
                    </div>

                    {/* 톤앤매너 프리셋 */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-2">빠른 선택</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          '친근하고 전문적인',
                          '유머러스하고 가벼운',
                          '진지하고 권위있는',
                          '따뜻하고 공감적인',
                          '빠르고 역동적인',
                        ].map((tone) => (
                          <button
                            key={tone}
                            onClick={() => setScriptTone(tone)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              scriptTone === tone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 대본 목차 */}
              {workflowStep === 'outline' && scriptOutline && selectedIdea && (
                <div className="space-y-6">
                  {/* 뒤로가기 */}
                  <button
                    onClick={() => setWorkflowStep('scriptOptions')}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm">설정으로 돌아가기</span>
                  </button>

                  {/* 대본 정보 */}
                  <div className="bg-gradient-to-r from-emerald-600/20 to-purple-600/20 rounded-xl p-6 border border-emerald-500/30">
                    <h3 className="text-xl font-bold text-white mb-2">{scriptOutline.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-300 mb-4">
                      <span>⏱️ {scriptOutline.estimatedDuration}</span>
                      <span>📝 {scriptOutline.sections.length}개 섹션</span>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="text-xs text-slate-400 mb-1">🎯 훅 (첫 문장)</div>
                      <p className="text-white font-medium">{scriptOutline.hook}</p>
                    </div>
                  </div>

                  {/* 섹션 목록 */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">대본 구조</h4>
                    <div className="space-y-3">
                      {scriptOutline.sections.map((section) => (
                        <div key={section.order} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {section.order}
                              </span>
                              <span className="font-medium text-white">{section.title}</span>
                            </div>
                            <span className="text-xs text-slate-400">{section.duration}</span>
                          </div>
                          <div className="ml-8">
                            <ul className="space-y-1 mb-2">
                              {section.keyPoints.map((point, idx) => (
                                <li key={idx} className="text-sm text-slate-300 flex items-start">
                                  <span className="text-emerald-400 mr-2">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                            <p className="text-xs text-slate-500 italic">{section.scriptHint}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA 및 태그 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-xs text-slate-400 mb-1">📢 CTA</div>
                      <p className="text-white text-sm">{scriptOutline.callToAction}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-xs text-slate-400 mb-1">🎨 썸네일 아이디어</div>
                      <p className="text-white text-sm">{scriptOutline.thumbnailIdea}</p>
                    </div>
                  </div>

                  {/* 태그 */}
                  <div>
                    <div className="text-xs text-slate-400 mb-2">🏷️ 추천 태그</div>
                    <div className="flex flex-wrap gap-2">
                      {scriptOutline.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 블로그 옵션 입력 */}
              {workflowStep === 'blogOptions' && selectedIdea && (
                <div className="space-y-6">
                  {/* 뒤로가기 */}
                  <button
                    onClick={() => setWorkflowStep('ideas')}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm">아이디어 목록으로</span>
                  </button>

                  {/* 선택된 아이디어 정보 */}
                  <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/30">
                    <h3 className="text-xl font-bold text-white mb-2">✏️ 블로그 작성 설정</h3>
                    <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
                      <div className="text-xs text-slate-400 mb-1">선택한 아이디어</div>
                      <p className="text-white font-medium">{selectedIdea.title}</p>
                      <p className="text-slate-400 text-sm mt-1">{selectedIdea.description}</p>
                    </div>
                  </div>

                  {/* 입력 필드들 */}
                  <div className="space-y-4">
                    {/* 타겟 독자 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        🎯 타겟 독자
                      </label>
                      <input
                        type="text"
                        value={blogTarget}
                        onChange={(e) => setBlogTarget(e.target.value)}
                        placeholder="예: 20대 직장인, 육아맘, IT 개발자"
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        블로그 글의 주요 독자층을 명시해주세요
                      </p>
                    </div>

                    {/* 톤앤매너 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        🎨 톤앤매너
                      </label>
                      <input
                        type="text"
                        value={blogTone}
                        onChange={(e) => setBlogTone(e.target.value)}
                        placeholder="예: 친근하고 유머러스한, 전문적이고 권위있는"
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        글의 어조와 분위기를 설정해주세요
                      </p>
                    </div>

                    {/* 톤앤매너 프리셋 */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-2">빠른 선택</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          '친근하고 전문적인',
                          '유머러스하고 가벼운',
                          '진지하고 권위있는',
                          '따뜻하고 공감적인',
                          '간결하고 실용적인',
                        ].map((tone) => (
                          <button
                            key={tone}
                            onClick={() => setBlogTone(tone)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              blogTone === tone
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 블로그 포스트 */}
              {workflowStep === 'blog' && blogPost && selectedIdea && (
                <div className="space-y-6">
                  {/* 뒤로가기 */}
                  <button
                    onClick={() => setWorkflowStep('ideas')}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm">아이디어 목록으로</span>
                  </button>

                  {/* DB 저장 결과 메시지 */}
                  {blogSaveResult && (
                    <div className={`p-4 rounded-lg border ${
                      blogSaveResult.success
                        ? 'bg-green-500/10 border-green-500/50'
                        : 'bg-red-500/10 border-red-500/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {blogSaveResult.success ? (
                            <span className="text-green-400 text-lg">✅</span>
                          ) : (
                            <span className="text-red-400 text-lg">❌</span>
                          )}
                          <span className={blogSaveResult.success ? 'text-green-400' : 'text-red-400'}>
                            {blogSaveResult.message}
                          </span>
                        </div>
                        {blogSaveResult.success && (
                          <button
                            onClick={() => router.push('/blog/history')}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                          >
                            <span>📚</span>
                            <span>블로그 히스토리 보기</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 블로그 헤더 */}
                  <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/30">
                    <h3 className="text-xl font-bold text-white mb-2">{blogPost.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-300 mb-4">
                      <span>📖 {blogPost.estimatedReadTime} 읽기</span>
                      <span>📝 {blogPost.sections.length}개 섹션</span>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="text-xs text-slate-400 mb-1">🔍 메타 설명 (SEO)</div>
                      <p className="text-slate-300 text-sm">{blogPost.metaDescription}</p>
                    </div>
                  </div>

                  {/* 도입부 */}
                  <div className="bg-slate-700/50 rounded-lg p-5 border border-slate-600">
                    <h4 className="text-sm font-semibold text-blue-400 mb-3">📌 도입부</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-line">{blogPost.introduction}</p>
                  </div>

                  {/* 본문 섹션들 */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">📑 본문</h4>
                    <div className="space-y-4">
                      {blogPost.sections.map((section, idx) => (
                        <div key={idx} className="bg-slate-700/50 rounded-lg p-5 border border-slate-600">
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <h5 className="font-medium text-white">{section.heading}</h5>
                          </div>
                          <p className="text-slate-300 text-sm whitespace-pre-line ml-8">{section.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 결론 */}
                  <div className="bg-slate-700/50 rounded-lg p-5 border border-slate-600">
                    <h4 className="text-sm font-semibold text-emerald-400 mb-3">🎯 결론</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-line">{blogPost.conclusion}</p>
                  </div>

                  {/* 태그 */}
                  <div>
                    <div className="text-xs text-slate-400 mb-2">🏷️ 블로그 태그</div>
                    <div className="flex flex-wrap gap-2">
                      {blogPost.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-600/30 text-blue-300 rounded text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 - 대본 옵션 */}
            {workflowStep === 'scriptOptions' && (
              <div className="p-6 border-t border-slate-700 flex justify-end space-x-3">
                <button
                  onClick={() => setWorkflowStep('ideas')}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSelectIdea}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
                >
                  <span>📝</span>
                  <span>대본 목차 생성하기</span>
                </button>
              </div>
            )}

            {/* 모달 푸터 - 블로그 옵션 */}
            {workflowStep === 'blogOptions' && (
              <div className="p-6 border-t border-slate-700 flex justify-end space-x-3">
                <button
                  onClick={() => setWorkflowStep('ideas')}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleGenerateBlog}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
                >
                  <span>✏️</span>
                  <span>블로그 생성하기</span>
                </button>
              </div>
            )}

            {/* 모달 푸터 - 대본 목차 */}
            {workflowStep === 'outline' && (
              <div className="p-6 border-t border-slate-700 flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={handleGenerateScript}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-purple-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  이 목차로 대본 생성하기 →
                </button>
              </div>
            )}

            {/* 모달 푸터 - 블로그 */}
            {workflowStep === 'blog' && (
              <div className="p-6 border-t border-slate-700 flex justify-between">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  닫기
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCopyBlog}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>복사하기</span>
                  </button>
                  {blogSaveResult?.success && (
                    <button
                      onClick={() => router.push('/blog/history')}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
                    >
                      <span>📚</span>
                      <span>블로그 히스토리 보기</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
