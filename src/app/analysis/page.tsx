'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

interface Comment {
  id: string;
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'improvement';
}

interface CommentAnalysis {
  positive: {
    count: number;
    percentage: number;
    summary: string;
    keywords: string[];
    comments: Comment[];
  };
  negative: {
    count: number;
    percentage: number;
    summary: string;
    keywords: string[];
    comments: Comment[];
  };
  improvements: {
    count: number;
    percentage: number;
    summary: string;
    suggestions: string[];
    comments: Comment[];
  };
  totalComments: number;
}

interface SelectedVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: number;
  subscriberCount: number;
  viralScore: number;
  viralGrade: string;
  format: string;
}

function AnalysisContent() {
  const searchParams = useSearchParams();
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [analysis, setAnalysis] = useState<CommentAnalysis | null>(null);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [expandedSection, setExpandedSection] = useState<'positive' | 'negative' | 'improvements' | null>(null);
  const [commentViewMode, setCommentViewMode] = useState<'card' | 'table'>('card');
  const [saveToDb, setSaveToDb] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [rawAnalysisResult, setRawAnalysisResult] = useState<any>(null);
  const [analyzedComments, setAnalyzedComments] = useState<string[]>([]);

  // Check for video ID from URL params and sessionStorage
  useEffect(() => {
    const videoIdFromUrl = searchParams.get('videoId');

    if (videoIdFromUrl) {
      const storedVideo = sessionStorage.getItem('selectedVideo');
      if (storedVideo) {
        const video = JSON.parse(storedVideo) as SelectedVideo;
        if (video.videoId === videoIdFromUrl) {
          setSelectedVideo(video);
          setVideoUrl(`https://youtube.com/watch?v=${videoIdFromUrl}`);
          startAnalysis(videoIdFromUrl, video.format || 'long');
        }
      } else {
        setVideoUrl(`https://youtube.com/watch?v=${videoIdFromUrl}`);
        startAnalysis(videoIdFromUrl, 'long');
      }
    }
  }, [searchParams]);

  const startAnalysis = async (videoId: string, format: string = 'long') => {
    setLoading(true);
    setError('');
    setAnalysis(null);
    setExpandedSection(null);
    setSavedAnalysisId(null);
    setRawAnalysisResult(null);
    setAnalyzedComments([]);

    try {
      // Step 1: Fetch comments from YouTube
      setLoadingStep('YouTube에서 댓글을 수집하는 중...');
      const commentsRes = await fetch(`/api/youtube/comments/${videoId}?format=${format}`);
      const commentsData = await commentsRes.json();

      if (!commentsData.success) {
        throw new Error(commentsData.error || '댓글을 가져오는데 실패했습니다.');
      }

      const fetchedComments: Comment[] = commentsData.data.comments.map((c: any, idx: number) => ({
        id: String(idx),
        author: c.author || c.authorDisplayName || '익명',
        text: c.text || c.textDisplay || c,
        likeCount: c.likeCount || 0,
        publishedAt: c.publishedAt || '',
      }));

      if (fetchedComments.length === 0) {
        throw new Error('수집된 댓글이 없습니다.');
      }

      // Step 2: Analyze comments with Gemini AI
      setLoadingStep(`${fetchedComments.length}개 댓글을 Gemini AI로 분석하는 중...`);

      const commentTexts = fetchedComments.map(c =>
        typeof c.text === 'string' ? c.text : String(c.text)
      );

      const analysisRes = await fetch('/api/analyze/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          comments: commentTexts,
          format,
        }),
      });

      const analysisData = await analysisRes.json();

      if (!analysisData.success) {
        throw new Error(analysisData.error || '댓글 분석에 실패했습니다.');
      }

      const result = analysisData.data;

      // Store raw result for potential DB saving
      setRawAnalysisResult(result);
      setAnalyzedComments(commentTexts);

      // Step 3: Classify comments
      setLoadingStep('분석 결과를 정리하는 중...');

      const negativeKeywords = result.negativeKeywords || [];

      const classifiedComments = fetchedComments.map(comment => {
        const text = comment.text.toLowerCase();

        // Check for improvement suggestions
        if (text.includes('해주세요') || text.includes('있으면') || text.includes('했으면') ||
            text.includes('부탁') || text.includes('추가') || text.includes('개선') ||
            text.includes('?') || text.includes('어떻게') || text.includes('왜') ||
            text.includes('원해') || text.includes('바람')) {
          return { ...comment, sentiment: 'improvement' as const };
        }

        // Check for negative sentiment
        const hasNegative = negativeKeywords.some((kw: string) => text.includes(kw.toLowerCase())) ||
          text.includes('별로') || text.includes('아쉽') || text.includes('싫') ||
          text.includes('안좋') || text.includes('불만') || text.includes('ㅠ') ||
          text.includes('실망') || text.includes('짜증') || text.includes('최악');

        if (hasNegative) {
          return { ...comment, sentiment: 'negative' as const };
        }

        return { ...comment, sentiment: 'positive' as const };
      });

      const positiveComments = classifiedComments.filter(c => c.sentiment === 'positive');
      const negativeComments = classifiedComments.filter(c => c.sentiment === 'negative');
      const improvementComments = classifiedComments.filter(c => c.sentiment === 'improvement');

      const total = classifiedComments.length;

      const improvementSuggestions = result.improvementSuggestions
        ? result.improvementSuggestions.split(/[.!?\n]/).filter((s: string) => s.trim().length > 10)
        : ['시청자 피드백을 반영한 콘텐츠 개선 필요'];

      setAnalysis({
        positive: {
          count: positiveComments.length,
          percentage: Math.round((positiveComments.length / total) * 100),
          summary: result.positiveSummary || '긍정적인 반응이 있습니다.',
          keywords: result.positiveKeywords || [],
          comments: positiveComments.sort((a, b) => b.likeCount - a.likeCount),
        },
        negative: {
          count: negativeComments.length,
          percentage: Math.round((negativeComments.length / total) * 100),
          summary: result.negativeSummary || '부정적인 반응이 있습니다.',
          keywords: result.negativeKeywords || [],
          comments: negativeComments.sort((a, b) => b.likeCount - a.likeCount),
        },
        improvements: {
          count: improvementComments.length,
          percentage: Math.round((improvementComments.length / total) * 100),
          summary: '시청자들이 원하는 개선사항입니다.',
          suggestions: improvementSuggestions.slice(0, 6),
          comments: improvementComments.sort((a, b) => b.likeCount - a.likeCount),
        },
        totalComments: total,
      });

      // 콘텐츠 아이디어 분석 및 히스토리 저장
      try {
        setLoadingStep('콘텐츠 아이디어를 분석하는 중...');
        const videoTitle = selectedVideo?.title || '';
        const currentFormat = selectedVideo?.format || 'long';

        const contentIdeasRes = await fetch('/api/analyze/content-ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            videoTitle,
            format: currentFormat,
          }),
        });

        const contentIdeasData = await contentIdeasRes.json();

        if (contentIdeasData.success) {
          // 콘텐츠 아이디어 히스토리에 저장
          await fetch('/api/content-ideas/workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceVideo: {
                videoId,
                title: selectedVideo?.title || videoTitle,
                channelTitle: selectedVideo?.channelTitle || '',
                thumbnailUrl: selectedVideo?.thumbnailUrl || '',
              },
              contentIdeas: {
                viewerQuestions: contentIdeasData.data.viewerQuestions || [],
                painPoints: contentIdeasData.data.painPoints || [],
                contentRequests: contentIdeasData.data.contentRequests || [],
                relatedTopics: contentIdeasData.data.relatedTopics || [],
                hotTopics: contentIdeasData.data.hotTopics || [],
                totalCommentsAnalyzed: total,
              },
              contentIdeasList: contentIdeasData.data.contentIdeas || [],
              format: currentFormat,
            }),
          });
          console.log('분석 결과가 콘텐츠 아이디어 히스토리에 저장되었습니다.');
        }
      } catch (contentIdeasErr) {
        console.error('콘텐츠 아이디어 저장 실패:', contentIdeasErr);
        // 메인 분석은 성공했으므로 에러를 무시
      }

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || '댓글 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setError('유효한 YouTube URL을 입력해주세요.');
      return;
    }

    startAnalysis(videoId);
  };

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const toggleSection = (section: 'positive' | 'negative' | 'improvements') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return '오늘';
      if (diffDays === 1) return '어제';
      if (diffDays < 7) return `${diffDays}일 전`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
      return `${Math.floor(diffDays / 365)}년 전`;
    } catch {
      return dateStr;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const saveAnalysisToDb = async () => {
    if (!rawAnalysisResult || saving || savedAnalysisId) return;

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setError('유효한 YouTube 비디오 ID가 없습니다.');
      return;
    }

    setSaving(true);
    try {
      // Step 1: Find or create video record
      const videoRes = await fetch('/api/videos/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeVideoId: videoId,
          title: selectedVideo?.title || `영상 ${videoId}`,
          channelId: selectedVideo?.channelTitle || 'unknown',
          channelName: selectedVideo?.channelTitle,
          subscriberCount: selectedVideo?.subscriberCount,
          viewCount: selectedVideo?.viewCount,
          thumbnailUrl: selectedVideo?.thumbnailUrl,
          viralScore: selectedVideo?.viralScore,
          viralGrade: selectedVideo?.viralGrade,
        }),
      });

      const videoData = await videoRes.json();
      if (!videoData.success) {
        throw new Error(videoData.error || '영상 정보 저장에 실패했습니다.');
      }

      const dbVideoId = videoData.data.id;

      // Step 2: Save analysis with DB video ID
      const analysisRes = await fetch('/api/analyze/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          comments: analyzedComments,
          format: selectedVideo?.format || 'long',
          saveToDb: true,
          dbVideoId,
        }),
      });

      const analysisData = await analysisRes.json();
      if (!analysisData.success) {
        throw new Error(analysisData.error || '분석 결과 저장에 실패했습니다.');
      }

      setSavedAnalysisId(analysisData.data.id);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">댓글 분석</h1>
        <p className="text-slate-400 mt-1">YouTube 영상의 댓글을 Gemini AI로 분석합니다.</p>
      </div>

      {/* 선택된 영상 정보 */}
      {selectedVideo && (
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col">
              <img
                src={selectedVideo.thumbnailUrl || '/placeholder-video.svg'}
                alt={selectedVideo.title}
                className="w-full aspect-video object-cover rounded-lg mb-4"
              />
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{selectedVideo.title}</h3>
                <p className="text-sm text-slate-400 mb-2">{selectedVideo.channelTitle}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-slate-300">
                    조회수: {selectedVideo.viewCount.toLocaleString()}
                  </span>
                  <span className="text-slate-300">
                    구독자: {selectedVideo.subscriberCount.toLocaleString()}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedVideo.viralGrade === 'S' ? 'bg-red-500 text-white' :
                    selectedVideo.viralGrade === 'A' ? 'bg-orange-500 text-white' :
                    selectedVideo.viralGrade === 'B' ? 'bg-yellow-500 text-black' :
                    selectedVideo.viralGrade === 'C' ? 'bg-green-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {selectedVideo.viralGrade} ({selectedVideo.viralScore.toFixed(2)})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 분석 폼 */}
      {!selectedVideo && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  YouTube 영상 URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="https://youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                  <Button type="submit" disabled={loading || !videoUrl.trim()}>
                    {loading ? '분석 중...' : '분석하기'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-slate-400">{loadingStep || '분석 중...'}</p>
          <p className="text-xs text-slate-500 mt-2">Gemini AI (gemini-3-pro-preview) 사용 중</p>
        </div>
      )}

      {/* 분석 결과 */}
      {!loading && analysis && (
        <div className="space-y-6">
          {/* AI 모델 정보 */}
          <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-2">
            <span className="text-purple-400 text-sm">
              🤖 Gemini AI (gemini-3-pro-preview)로 분석됨
            </span>
            <span className="text-slate-400 text-sm">
              총 {analysis.totalComments}개 댓글 분석 완료
            </span>
          </div>

          {/* 감성 분포 바 */}
          <Card>
            <CardHeader>
              <CardTitle>댓글 분석 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-10 rounded-lg overflow-hidden mb-4">
                <div
                  className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${analysis.positive.percentage}%` }}
                >
                  {analysis.positive.percentage > 8 && `${analysis.positive.percentage}%`}
                </div>
                <div
                  className="bg-red-500 flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${analysis.negative.percentage}%` }}
                >
                  {analysis.negative.percentage > 8 && `${analysis.negative.percentage}%`}
                </div>
                <div
                  className="bg-yellow-500 flex items-center justify-center text-black text-sm font-medium"
                  style={{ width: `${analysis.improvements.percentage}%` }}
                >
                  {analysis.improvements.percentage > 8 && `${analysis.improvements.percentage}%`}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-400">긍정적인 점 {analysis.positive.percentage}%</span>
                <span className="text-red-400">부정적인 점 {analysis.negative.percentage}%</span>
                <span className="text-yellow-400">개선을 원하는 점 {analysis.improvements.percentage}%</span>
              </div>
            </CardContent>
          </Card>

          {/* 긍정적인 점 */}
          <Card
            className={`cursor-pointer transition-all hover:border-green-500/50 ${expandedSection === 'positive' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => toggleSection('positive')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">👍</span>
                  <div>
                    <span className="text-green-400">긍정적인 점</span>
                    <span className="ml-2 text-sm font-normal text-slate-400">({analysis.positive.count}개)</span>
                  </div>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-green-400">{analysis.positive.percentage}%</span>
                  <span className="text-slate-400">{expandedSection === 'positive' ? '▲' : '▼'}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 bg-green-500/10 p-3 rounded-lg border border-green-500/30 mb-3">
                {analysis.positive.summary}
              </p>
              {analysis.positive.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {analysis.positive.keywords.map((keyword, idx) => (
                    <span key={idx} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>

            {/* 대표 댓글 (클릭 시 표시) */}
            {expandedSection === 'positive' && (
              <div className="border-t border-slate-700 px-6 py-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-400">대표 댓글 (좋아요 순 상위 10개)</p>
                  <div className="flex items-center space-x-2">
                    {/* 뷰 토글 버튼 */}
                    <div className="flex items-center space-x-1 bg-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => setCommentViewMode('card')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
                          commentViewMode === 'card'
                            ? 'bg-green-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>카드</span>
                      </button>
                      <button
                        onClick={() => setCommentViewMode('table')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
                          commentViewMode === 'table'
                            ? 'bg-green-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span>테이블</span>
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const text = analysis.positive.comments.slice(0, 10).map(c => `[${c.author}] ${c.text}`).join('\n\n');
                        copyToClipboard(text);
                      }}
                    >
                      복사
                    </Button>
                  </div>
                </div>

                {/* 카드뷰 */}
                {commentViewMode === 'card' && (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {analysis.positive.comments.slice(0, 10).map((comment, idx) => (
                      <div key={comment.id} className="p-3 bg-slate-700/50 rounded-lg border border-green-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-400 font-bold text-sm">#{idx + 1}</span>
                            <span className="font-medium text-slate-300">{comment.author}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <span>👍 {comment.likeCount}</span>
                            <span>{formatDate(comment.publishedAt)}</span>
                          </div>
                        </div>
                        <p className="text-slate-200 text-sm">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 테이블뷰 */}
                {commentViewMode === 'table' && (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-700/50 sticky top-0">
                        <tr className="text-left text-xs text-slate-400">
                          <th className="px-3 py-2 font-medium w-10">#</th>
                          <th className="px-3 py-2 font-medium w-24">작성자</th>
                          <th className="px-3 py-2 font-medium">댓글 내용</th>
                          <th className="px-3 py-2 font-medium text-right w-16">좋아요</th>
                          <th className="px-3 py-2 font-medium text-right w-20">작성일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {analysis.positive.comments.slice(0, 10).map((comment, idx) => (
                          <tr key={comment.id} className="hover:bg-slate-700/30">
                            <td className="px-3 py-2 text-green-400 font-bold text-sm">{idx + 1}</td>
                            <td className="px-3 py-2 text-slate-300 text-sm truncate max-w-[100px]">{comment.author}</td>
                            <td className="px-3 py-2 text-slate-200 text-sm">{comment.text}</td>
                            <td className="px-3 py-2 text-right text-slate-400 text-sm">{comment.likeCount}</td>
                            <td className="px-3 py-2 text-right text-slate-500 text-xs">{formatDate(comment.publishedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 부정적인 점 */}
          <Card
            className={`cursor-pointer transition-all hover:border-red-500/50 ${expandedSection === 'negative' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => toggleSection('negative')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">👎</span>
                  <div>
                    <span className="text-red-400">부정적인 점</span>
                    <span className="ml-2 text-sm font-normal text-slate-400">({analysis.negative.count}개)</span>
                  </div>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-red-400">{analysis.negative.percentage}%</span>
                  <span className="text-slate-400">{expandedSection === 'negative' ? '▲' : '▼'}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 bg-red-500/10 p-3 rounded-lg border border-red-500/30 mb-3">
                {analysis.negative.summary}
              </p>
              {analysis.negative.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {analysis.negative.keywords.map((keyword, idx) => (
                    <span key={idx} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>

            {/* 대표 댓글 (클릭 시 표시) */}
            {expandedSection === 'negative' && (
              <div className="border-t border-slate-700 px-6 py-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-400">대표 댓글 (좋아요 순 상위 10개)</p>
                  <div className="flex items-center space-x-2">
                    {/* 뷰 토글 버튼 */}
                    <div className="flex items-center space-x-1 bg-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => setCommentViewMode('card')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
                          commentViewMode === 'card'
                            ? 'bg-red-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>카드</span>
                      </button>
                      <button
                        onClick={() => setCommentViewMode('table')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
                          commentViewMode === 'table'
                            ? 'bg-red-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span>테이블</span>
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const text = analysis.negative.comments.slice(0, 10).map(c => `[${c.author}] ${c.text}`).join('\n\n');
                        copyToClipboard(text);
                      }}
                    >
                      복사
                    </Button>
                  </div>
                </div>

                {analysis.negative.comments.length > 0 ? (
                  <>
                    {/* 카드뷰 */}
                    {commentViewMode === 'card' && (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {analysis.negative.comments.slice(0, 10).map((comment, idx) => (
                          <div key={comment.id} className="p-3 bg-slate-700/50 rounded-lg border border-red-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-red-400 font-bold text-sm">#{idx + 1}</span>
                                <span className="font-medium text-slate-300">{comment.author}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-slate-500">
                                <span>👍 {comment.likeCount}</span>
                                <span>{formatDate(comment.publishedAt)}</span>
                              </div>
                            </div>
                            <p className="text-slate-200 text-sm">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 테이블뷰 */}
                    {commentViewMode === 'table' && (
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-slate-700/50 sticky top-0">
                            <tr className="text-left text-xs text-slate-400">
                              <th className="px-3 py-2 font-medium w-10">#</th>
                              <th className="px-3 py-2 font-medium w-24">작성자</th>
                              <th className="px-3 py-2 font-medium">댓글 내용</th>
                              <th className="px-3 py-2 font-medium text-right w-16">좋아요</th>
                              <th className="px-3 py-2 font-medium text-right w-20">작성일</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {analysis.negative.comments.slice(0, 10).map((comment, idx) => (
                              <tr key={comment.id} className="hover:bg-slate-700/30">
                                <td className="px-3 py-2 text-red-400 font-bold text-sm">{idx + 1}</td>
                                <td className="px-3 py-2 text-slate-300 text-sm truncate max-w-[100px]">{comment.author}</td>
                                <td className="px-3 py-2 text-slate-200 text-sm">{comment.text}</td>
                                <td className="px-3 py-2 text-right text-slate-400 text-sm">{comment.likeCount}</td>
                                <td className="px-3 py-2 text-right text-slate-500 text-xs">{formatDate(comment.publishedAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-slate-500 text-center py-4">부정적인 댓글이 없습니다.</p>
                )}
              </div>
            )}
          </Card>

          {/* 개선을 원하는 점 */}
          <Card
            className={`cursor-pointer transition-all hover:border-yellow-500/50 ${expandedSection === 'improvements' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => toggleSection('improvements')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">💡</span>
                  <div>
                    <span className="text-yellow-400">개선을 원하는 점</span>
                    <span className="ml-2 text-sm font-normal text-slate-400">({analysis.improvements.count}개)</span>
                  </div>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-yellow-400">{analysis.improvements.percentage}%</span>
                  <span className="text-slate-400">{expandedSection === 'improvements' ? '▲' : '▼'}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/30 mb-3">
                {analysis.improvements.summary}
              </p>
              {analysis.improvements.suggestions.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">AI 추천 개선사항:</p>
                  <ul className="space-y-1">
                    {analysis.improvements.suggestions.slice(0, 3).map((suggestion, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-sm">
                        <span className="text-yellow-400">•</span>
                        <span className="text-slate-300">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>

            {/* 대표 댓글 (클릭 시 표시) */}
            {expandedSection === 'improvements' && (
              <div className="border-t border-slate-700 px-6 py-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-400">관련 댓글 (좋아요 순 상위 10개)</p>
                  <div className="flex items-center space-x-2">
                    {/* 뷰 토글 버튼 */}
                    <div className="flex items-center space-x-1 bg-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => setCommentViewMode('card')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
                          commentViewMode === 'card'
                            ? 'bg-yellow-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>카드</span>
                      </button>
                      <button
                        onClick={() => setCommentViewMode('table')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
                          commentViewMode === 'table'
                            ? 'bg-yellow-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span>테이블</span>
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const text = analysis.improvements.comments.slice(0, 10).map(c => `[${c.author}] ${c.text}`).join('\n\n');
                        copyToClipboard(text);
                      }}
                    >
                      복사
                    </Button>
                  </div>
                </div>

                {analysis.improvements.comments.length > 0 ? (
                  <>
                    {/* 카드뷰 */}
                    {commentViewMode === 'card' && (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {analysis.improvements.comments.slice(0, 10).map((comment, idx) => (
                          <div key={comment.id} className="p-3 bg-slate-700/50 rounded-lg border border-yellow-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-yellow-400 font-bold text-sm">#{idx + 1}</span>
                                <span className="font-medium text-slate-300">{comment.author}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-slate-500">
                                <span>👍 {comment.likeCount}</span>
                                <span>{formatDate(comment.publishedAt)}</span>
                              </div>
                            </div>
                            <p className="text-slate-200 text-sm">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 테이블뷰 */}
                    {commentViewMode === 'table' && (
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-slate-700/50 sticky top-0">
                            <tr className="text-left text-xs text-slate-400">
                              <th className="px-3 py-2 font-medium w-10">#</th>
                              <th className="px-3 py-2 font-medium w-24">작성자</th>
                              <th className="px-3 py-2 font-medium">댓글 내용</th>
                              <th className="px-3 py-2 font-medium text-right w-16">좋아요</th>
                              <th className="px-3 py-2 font-medium text-right w-20">작성일</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {analysis.improvements.comments.slice(0, 10).map((comment, idx) => (
                              <tr key={comment.id} className="hover:bg-slate-700/30">
                                <td className="px-3 py-2 text-yellow-400 font-bold text-sm">{idx + 1}</td>
                                <td className="px-3 py-2 text-slate-300 text-sm truncate max-w-[100px]">{comment.author}</td>
                                <td className="px-3 py-2 text-slate-200 text-sm">{comment.text}</td>
                                <td className="px-3 py-2 text-right text-slate-400 text-sm">{comment.likeCount}</td>
                                <td className="px-3 py-2 text-right text-slate-500 text-xs">{formatDate(comment.publishedAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-slate-500 text-center py-4">개선 요청 댓글이 없습니다.</p>
                )}
              </div>
            )}
          </Card>

          {/* DB 저장 */}
          <Card>
            <CardHeader>
              <CardTitle>분석 결과 저장</CardTitle>
            </CardHeader>
            <CardContent>
              {savedAnalysisId ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✅</span>
                    <p className="text-slate-300">
                      분석 결과가 데이터베이스에 저장되었습니다. (ID: {savedAnalysisId})
                    </p>
                  </div>
                  <Link href="/analysis/history">
                    <Button variant="outline">
                      <span className="mr-2">📋</span>
                      분석 기록 보기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-slate-300">
                    분석 결과를 데이터베이스에 저장하여 나중에 다시 확인할 수 있습니다.
                  </p>
                  <Button
                    onClick={saveAnalysisToDb}
                    disabled={saving || !rawAnalysisResult}
                    variant="outline"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        저장 중...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">💾</span>
                        DB에 저장
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 다음 단계 */}
          <Card>
            <CardHeader>
              <CardTitle>다음 단계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <p className="text-slate-300">
                  분석 결과를 바탕으로 콘텐츠를 생성하시겠습니까?
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/scripts">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <span className="mr-2">📝</span>
                      대본 생성하기
                    </Button>
                  </Link>
                  <Link href="/blog">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <span className="mr-2">✏️</span>
                      블로그 생성하기
                    </Button>
                  </Link>
                  <Link href="/content-ideas/history">
                    <Button variant="outline">
                      <span className="mr-2">💡</span>
                      콘텐츠 아이디어 보기
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 분석 전 안내 */}
      {!loading && !analysis && !error && !selectedVideo && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-white mb-2">영상 URL을 입력하세요</h3>
            <p className="text-slate-400 mb-4">
              YouTube 영상의 댓글을 Gemini AI가 분석합니다.
            </p>
            <div className="text-sm text-slate-500">
              <p>분석 내용:</p>
              <ul className="mt-2 space-y-1">
                <li>• 👍 긍정적인 점 - 칭찬, 감사 댓글</li>
                <li>• 👎 부정적인 점 - 불만, 비판 댓글</li>
                <li>• 💡 개선을 원하는 점 - 건의, 요청 댓글</li>
              </ul>
            </div>
            <div className="mt-4 text-xs text-purple-400">
              🤖 Gemini AI (gemini-3-pro-preview) 사용
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="p-6 bg-slate-900 min-h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AnalysisContent />
    </Suspense>
  );
}
