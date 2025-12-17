'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

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
  idea_selected: { label: '아이디어 선택', color: 'bg-blue-500' },
  outline_created: { label: '목차 생성', color: 'bg-yellow-500' },
  script_generated: { label: '대본 생성', color: 'bg-green-500' },
  completed: { label: '완료', color: 'bg-purple-500' },
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

  const handleContinue = (workflow: Workflow) => {
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
                      src={workflow.sourceVideo.thumbnailUrl}
                      alt={workflow.sourceVideo.title}
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
                        <p className="text-sm text-slate-400 mt-1">
                          원본: {workflow.sourceVideo.title}
                        </p>
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
                      {workflow.outline && (
                        <span className="text-emerald-400">
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
                    src={selectedWorkflow.sourceVideo.thumbnailUrl}
                    alt={selectedWorkflow.sourceVideo.title}
                    className="w-32 h-20 object-cover rounded"
                  />
                  <div>
                    <p className="text-white font-medium">{selectedWorkflow.sourceVideo.title}</p>
                    <p className="text-sm text-slate-400">{selectedWorkflow.sourceVideo.channelTitle}</p>
                  </div>
                </div>
              </div>

              {/* 선택된 아이디어 */}
              {selectedWorkflow.selectedIdea && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">선택된 아이디어</h3>
                  <div className="bg-slate-700/50 rounded-lg p-4">
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
              <Button onClick={() => {
                setShowDetailModal(false);
                handleContinue(selectedWorkflow);
              }}>
                이어서 작업하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
