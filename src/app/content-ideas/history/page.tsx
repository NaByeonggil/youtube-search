'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

interface ContentIdeaItem {
  id: number;
  title: string;
  description: string;
  targetAudience: string;
  estimatedViralScore: '상' | '중' | '하';
  reasoning: string;
  suggestedFormat: '숏폼' | '롱폼';
}

interface Workflow {
  id: number;
  sourceVideo: {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnailUrl: string;
  };
  format: 'short' | 'long';
  totalCommentsAnalyzed: number;
  contentIdeas: {
    viewerQuestions: string[];
    painPoints: string[];
    contentRequests: string[];
    relatedTopics: string[];
    hotTopics: string[];
  };
  contentIdeasList: ContentIdeaItem[];
  selectedIdea: {
    title: string;
    description: string;
    targetAudience: string;
    estimatedViralScore: string;
    suggestedFormat: string;
    reasoning: string;
  } | null;
  outline: {
    title: string;
    hook: string;
    estimatedDuration: string;
    sections: Array<{
      order: number;
      title: string;
      duration: string;
      keyPoints: string[];
      scriptHint: string;
    }>;
    callToAction: string;
    thumbnailIdea: string;
    tags: string[];
  } | null;
  generatedScript: {
    fullScript: string;
  } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ideas_generated: { label: '아이디어 분석', color: 'bg-emerald-500' },
  idea_selected: { label: '아이디어 선택', color: 'bg-blue-500' },
  outline_created: { label: '목차 생성', color: 'bg-yellow-500' },
  script_generated: { label: '대본 생성', color: 'bg-green-500' },
  completed: { label: '완료', color: 'bg-purple-500' },
};

const viralScoreColors: Record<string, string> = {
  상: 'text-green-400',
  중: 'text-yellow-400',
  하: 'text-red-400',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ContentIdeasHistoryPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [generatingBlog, setGeneratingBlog] = useState<number | null>(null);
  // 상세보기에서 선택한 콘텐츠 아이디어 (이어서 작업하기 시 블로그 생성 화면으로 전달)
  const [selectedIdeaIdx, setSelectedIdeaIdx] = useState<number | null>(null);

  // 블로그 생성 옵션 모달 상태
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [blogTargetWorkflow, setBlogTargetWorkflow] = useState<Workflow | null>(null);
  const [blogOptions, setBlogOptions] = useState({
    customTarget: '',
    toneAndManner: '',
    keywords: '',
  });

  useEffect(() => {
    fetchWorkflows();
  }, [page]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-ideas/workflow?page=${page}&limit=10`);
      const data = await res.json();

      if (data.success) {
        setWorkflows(data.data);
        setTotalPages(data.meta.totalPages);
      } else {
        setError(data.error || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/content-ideas/workflow/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setWorkflows(prev => prev.filter(w => w.id !== id));
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  // 블로그 생성 모달 열기
  const openBlogModal = (workflow: Workflow) => {
    if (!workflow.selectedIdea) {
      alert('선택된 아이디어가 없습니다. 먼저 아이디어를 선택해주세요.');
      return;
    }
    setBlogTargetWorkflow(workflow);
    setBlogOptions({
      customTarget: workflow.selectedIdea.targetAudience || '',
      toneAndManner: '',
      keywords: '',
    });
    setShowBlogModal(true);
    setShowDetailModal(false);
  };

  // 블로그 생성 실행
  const handleGenerateBlog = async () => {
    if (!blogTargetWorkflow || !blogTargetWorkflow.selectedIdea) {
      alert('선택된 아이디어가 없습니다.');
      return;
    }

    const workflow = blogTargetWorkflow;
    const selectedIdea = workflow.selectedIdea!;
    setGeneratingBlog(workflow.id);
    setShowBlogModal(false);

    try {
      // 블로그 생성 API 호출
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentIdea: {
            id: workflow.id,
            title: selectedIdea.title,
            description: selectedIdea.description,
            targetAudience: selectedIdea.targetAudience,
            estimatedViralScore: selectedIdea.estimatedViralScore as '상' | '중' | '하',
            reasoning: selectedIdea.reasoning,
            suggestedFormat: selectedIdea.suggestedFormat as '숏폼' | '롱폼',
          },
          customTarget: blogOptions.customTarget || undefined,
          toneAndManner: blogOptions.toneAndManner || undefined,
          additionalContext: blogOptions.keywords ? `키워드: ${blogOptions.keywords}` : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 블로그 생성 성공 - 생성된 블로그를 저장
        const saveRes = await fetch('/api/blog/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceVideo: {
              videoId: workflow.sourceVideo.videoId,
              title: workflow.sourceVideo.title,
              channelName: workflow.sourceVideo.channelTitle,
            },
            idea: {
              title: selectedIdea.title,
              description: selectedIdea.description,
              targetAudience: selectedIdea.targetAudience,
            },
            blogPost: data.data.blogPost,
            options: {
              customTarget: blogOptions.customTarget || undefined,
              toneAndManner: blogOptions.toneAndManner || undefined,
            },
          }),
        });

        const saveData = await saveRes.json();

        if (saveData.success) {
          alert('블로그가 생성되어 저장되었습니다!');
          router.push('/blog/history');
        } else {
          alert('블로그는 생성되었지만 저장에 실패했습니다: ' + (saveData.error || ''));
        }
      } else {
        alert('블로그 생성에 실패했습니다: ' + (data.error || ''));
      }
    } catch (err) {
      alert('블로그 생성 중 오류가 발생했습니다.');
      console.error('Blog generation error:', err);
    } finally {
      setGeneratingBlog(null);
      setBlogTargetWorkflow(null);
    }
  };

  const handleContinue = (workflow: Workflow, idea?: ContentIdeaItem) => {
    // 상세보기에서 아이디어 카드를 고른 경우 블로그 생성 화면으로 이동
    if (idea) {
      sessionStorage.setItem('contentIdeaContext', JSON.stringify({
        type: 'content-idea',
        idea: {
          title: idea.title,
          description: idea.description,
          targetAudience: idea.targetAudience,
          estimatedViralScore: idea.estimatedViralScore,
          reasoning: idea.reasoning,
          suggestedFormat: idea.suggestedFormat,
        },
        sourceVideo: {
          videoId: workflow.sourceVideo.videoId,
          title: workflow.sourceVideo.title,
          channelName: workflow.sourceVideo.channelTitle,
          thumbnailUrl: workflow.sourceVideo.thumbnailUrl,
        },
        format: workflow.format,
      }));
      router.push('/blog');
      return;
    }

    // 워크플로우 데이터를 sessionStorage에 저장하고 적절한 페이지로 이동
    if (workflow.generatedScript) {
      // 이미 대본이 있으면 대본 페이지로
      sessionStorage.setItem('loadedScript', JSON.stringify({
        fullScript: workflow.generatedScript.fullScript,
        outline: workflow.outline,
        contentIdea: workflow.selectedIdea,
      }));
      router.push('/scripts');
    } else if (workflow.outline) {
      // 목차가 있으면 대본 생성 페이지로
      sessionStorage.setItem('scriptOutline', JSON.stringify({
        outline: workflow.outline,
        contentIdea: workflow.selectedIdea,
        sourceVideo: workflow.sourceVideo,
        format: workflow.format,
      }));
      router.push('/scripts');
    } else {
      // 아이디어만 있으면 검색 페이지로 (다시 시작)
      router.push('/search');
    }
  };

  const viewDetail = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setSelectedIdeaIdx(null);
    setShowDetailModal(true);
  };

  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">콘텐츠 아이디어 히스토리</h1>
          <p className="text-slate-400 mt-1">저장된 콘텐츠 아이디어 워크플로우를 확인하고 이어서 작업하세요.</p>
        </div>
        <Link href="/search">
          <Button>
            <span className="mr-2">🔍</span>
            새 검색
          </Button>
        </Link>
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

      {/* 결과 없음 */}
      {!loading && workflows.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-5xl mb-4">💡</div>
            <h3 className="text-xl font-semibold text-white mb-2">저장된 워크플로우가 없습니다</h3>
            <p className="text-slate-400 mb-4">
              키워드 검색에서 영상을 선택하고 소재 추천을 받아보세요.
            </p>
            <Link href="/search">
              <Button>
                <span className="mr-2">🔍</span>
                키워드 검색하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 워크플로우 목록 */}
      {!loading && workflows.length > 0 && (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover:border-purple-500/50 transition-colors">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 p-4">
                  {/* 썸네일 */}
                  <div className="flex-shrink-0">
                    <img
                      src={workflow.sourceVideo.thumbnailUrl || (workflow.sourceVideo.videoId ? `https://img.youtube.com/vi/${workflow.sourceVideo.videoId}/mqdefault.jpg` : '/placeholder-video.svg')}
                      alt={workflow.sourceVideo.title || '영상 썸네일'}
                      className="w-40 h-24 object-cover rounded-lg"
                    />
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white line-clamp-1">
                          {workflow.selectedIdea?.title || workflow.sourceVideo.title}
                        </h3>
                        <a
                          href={`https://youtube.com/watch?v=${workflow.sourceVideo.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-slate-400 mt-1 hover:text-purple-400 transition-colors flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>🔗</span> 원본: {workflow.sourceVideo.title}
                        </a>
                        <p className="text-xs text-slate-500 mt-1">
                          {workflow.sourceVideo.channelTitle} · {formatDate(workflow.createdAt)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusLabels[workflow.status]?.color || 'bg-gray-500'}`}>
                        {statusLabels[workflow.status]?.label || workflow.status}
                      </span>
                    </div>

                    {/* 통계 */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-slate-400">
                        💬 댓글 {workflow.totalCommentsAnalyzed}개 분석
                      </span>
                      <span className="text-slate-400">
                        📝 {workflow.format === 'short' ? '숏폼' : '롱폼'}
                      </span>
                      {workflow.contentIdeasList && workflow.contentIdeasList.length > 0 && (
                        <span className="text-emerald-400">
                          💡 아이디어 {workflow.contentIdeasList.length}개
                        </span>
                      )}
                      {workflow.outline && (
                        <span className="text-yellow-400">
                          ✅ 목차 생성됨
                        </span>
                      )}
                      {workflow.generatedScript && (
                        <span className="text-purple-400">
                          ✅ 대본 생성됨
                        </span>
                      )}
                    </div>

                    {/* 태그 */}
                    {workflow.contentIdeas.hotTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {workflow.contentIdeas.hotTopics.slice(0, 3).map((topic, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                            {topic}
                          </span>
                        ))}
                        {workflow.contentIdeas.hotTopics.length > 3 && (
                          <span className="text-xs text-slate-500">
                            +{workflow.contentIdeas.hotTopics.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleContinue(workflow)}
                    >
                      이어서 작업
                    </Button>
                    {workflow.selectedIdea && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openBlogModal(workflow)}
                        disabled={generatingBlog === workflow.id}
                        className="text-purple-400 border-purple-400 hover:bg-purple-500/10"
                      >
                        {generatingBlog === workflow.id ? '생성 중...' : '📝 블로그 생성'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewDetail(workflow)}
                    >
                      상세보기
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(workflow.id)}
                      disabled={deleting === workflow.id}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      {deleting === workflow.id ? '삭제 중...' : '삭제'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <span className="text-slate-400 text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 블로그 생성 옵션 모달 */}
      {showBlogModal && blogTargetWorkflow && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg overflow-hidden">
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">📝 블로그 생성 옵션</h2>
              <p className="text-sm text-slate-400 mt-1">
                블로그 생성 시 적용할 옵션을 설정하세요.
              </p>
            </div>

            {/* 선택된 아이디어 정보 */}
            {blogTargetWorkflow.selectedIdea && (
              <div className="px-6 pt-4">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-medium text-sm mb-1">선택된 아이디어</h4>
                  <p className="text-white font-semibold">{blogTargetWorkflow.selectedIdea.title}</p>
                  <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                    {blogTargetWorkflow.selectedIdea.description}
                  </p>
                </div>
              </div>
            )}

            {/* 옵션 입력 */}
            <div className="p-6 space-y-4">
              {/* 타겟 독자 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  🎯 타겟 독자
                </label>
                <input
                  type="text"
                  value={blogOptions.customTarget}
                  onChange={(e) => setBlogOptions(prev => ({ ...prev, customTarget: e.target.value }))}
                  placeholder="예: 20-30대 직장인, 마케팅 초보자, 주부"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  블로그의 주요 독자층을 지정하세요.
                </p>
              </div>

              {/* 분위기/톤앤매너 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  🎭 분위기 (톤앤매너)
                </label>
                <select
                  value={blogOptions.toneAndManner}
                  onChange={(e) => setBlogOptions(prev => ({ ...prev, toneAndManner: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">선택하세요 (기본: 친근한)</option>
                  <option value="친근하고 편안한">친근하고 편안한</option>
                  <option value="전문적이고 신뢰감있는">전문적이고 신뢰감있는</option>
                  <option value="유머러스하고 재미있는">유머러스하고 재미있는</option>
                  <option value="감성적이고 공감가는">감성적이고 공감가는</option>
                  <option value="간결하고 핵심적인">간결하고 핵심적인</option>
                  <option value="열정적이고 동기부여하는">열정적이고 동기부여하는</option>
                  <option value="차분하고 설명적인">차분하고 설명적인</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  블로그 글의 전반적인 분위기를 선택하세요.
                </p>
              </div>

              {/* 키워드 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  🏷️ 키워드
                </label>
                <input
                  type="text"
                  value={blogOptions.keywords}
                  onChange={(e) => setBlogOptions(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="예: SEO, 디지털마케팅, 브랜딩 (쉼표로 구분)"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  블로그에 포함할 주요 키워드를 입력하세요.
                </p>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBlogModal(false);
                  setBlogTargetWorkflow(null);
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleGenerateBlog}
                disabled={generatingBlog !== null}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generatingBlog ? '생성 중...' : '블로그 생성'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 상세보기 모달 */}
      {showDetailModal && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">워크플로우 상세</h2>
                <p className="text-sm text-slate-400 mt-1">{formatDate(selectedWorkflow.createdAt)}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 모달 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 소스 영상 */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">원본 영상</h3>
                <div className="flex items-center gap-4 bg-slate-700/50 rounded-lg p-4">
                  <img
                    src={selectedWorkflow.sourceVideo.thumbnailUrl || (selectedWorkflow.sourceVideo.videoId ? `https://img.youtube.com/vi/${selectedWorkflow.sourceVideo.videoId}/mqdefault.jpg` : '/placeholder-video.svg')}
                    alt={selectedWorkflow.sourceVideo.title || '영상 썸네일'}
                    className="w-32 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{selectedWorkflow.sourceVideo.title}</p>
                    <p className="text-sm text-slate-400">{selectedWorkflow.sourceVideo.channelTitle}</p>
                    <a
                      href={`https://youtube.com/watch?v=${selectedWorkflow.sourceVideo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <span>▶️</span> YouTube에서 보기
                    </a>
                  </div>
                </div>
              </div>

              {/* 분석된 콘텐츠 아이디어 목록 */}
              {selectedWorkflow.contentIdeasList && selectedWorkflow.contentIdeasList.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">
                    💡 분석된 콘텐츠 아이디어 ({selectedWorkflow.contentIdeasList.length}개)
                    <span className="ml-2 text-xs text-slate-500 font-normal">— 카드를 선택하면 [이어서 작업하기] 시 블로그 생성 화면으로 이어집니다</span>
                  </h3>
                  <div className="space-y-3">
                    {selectedWorkflow.contentIdeasList.map((idea, idx) => (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selectedIdeaIdx === idx}
                        onClick={() => setSelectedIdeaIdx(selectedIdeaIdx === idx ? null : idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedIdeaIdx(selectedIdeaIdx === idx ? null : idx);
                          }
                        }}
                        className={`rounded-lg p-4 border cursor-pointer transition-colors ${
                          selectedIdeaIdx === idx
                            ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-slate-700/50 border-slate-600 hover:border-purple-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-base font-semibold text-white">
                            {selectedIdeaIdx === idx && <span className="text-purple-400 mr-1">✓</span>}
                            {idea.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-bold ${viralScoreColors[idea.estimatedViralScore] || 'text-slate-400'}`}>
                              {idea.estimatedViralScore === '상' ? '🔥 높음' : idea.estimatedViralScore === '중' ? '⚡ 보통' : '💤 낮음'}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-600 rounded text-xs text-slate-300">
                              {idea.suggestedFormat}
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{idea.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>🎯 타겟: {idea.targetAudience}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 italic">💡 {idea.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 선택된 아이디어 */}
              {selectedWorkflow.selectedIdea && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">✅ 선택된 아이디어</h3>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white">{selectedWorkflow.selectedIdea.title}</h4>
                    <p className="text-slate-300 mt-2">{selectedWorkflow.selectedIdea.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-slate-400">타겟: {selectedWorkflow.selectedIdea.targetAudience}</span>
                      <span className="text-slate-400">예상 바이럴: {selectedWorkflow.selectedIdea.estimatedViralScore}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 대본 목차 */}
              {selectedWorkflow.outline && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">대본 목차</h3>
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-xs text-slate-400">제목</span>
                      <p className="text-white font-medium">{selectedWorkflow.outline.title}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">훅</span>
                      <p className="text-slate-300">{selectedWorkflow.outline.hook}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">섹션</span>
                      <div className="space-y-2 mt-1">
                        {selectedWorkflow.outline.sections.map((section) => (
                          <div key={section.order} className="bg-slate-800 rounded p-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">
                                {section.order}
                              </span>
                              <span className="text-white text-sm">{section.title}</span>
                              <span className="text-xs text-slate-500">{section.duration}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 생성된 대본 */}
              {selectedWorkflow.generatedScript && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">생성된 대본</h3>
                  <div className="bg-slate-700/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-slate-300 text-sm whitespace-pre-wrap">
                      {selectedWorkflow.generatedScript.fullScript}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                닫기
              </Button>
              {selectedWorkflow.selectedIdea && (
                <Button
                  variant="outline"
                  onClick={() => openBlogModal(selectedWorkflow)}
                  disabled={generatingBlog === selectedWorkflow.id}
                  className="text-purple-400 border-purple-400 hover:bg-purple-500/10"
                >
                  {generatingBlog === selectedWorkflow.id ? '생성 중...' : '📝 블로그 생성'}
                </Button>
              )}
              <Button onClick={() => {
                const pickedIdea =
                  selectedIdeaIdx !== null
                    ? selectedWorkflow.contentIdeasList?.[selectedIdeaIdx]
                    : undefined;
                setShowDetailModal(false);
                handleContinue(selectedWorkflow, pickedIdea);
              }}>
                {selectedIdeaIdx !== null ? '이어서 작업하기 (블로그 생성)' : '이어서 작업하기'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
