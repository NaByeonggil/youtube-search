'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalysisRecord {
  id: number;
  title: string | null;
  originalScript: string;
  scriptSource: 'manual' | 'youtube-caption' | 'whisper';
  youtubeVideoId: string | null;
  analysis: {
    structure: {
      sections: Array<{
        name: string;
        startChar: number;
        endChar: number;
        content: string;
        purpose: string;
      }>;
    } | null;
    characterCount: {
      total: number;
      bySection: Array<{
        section: string;
        count: number;
        percentage: number;
      }>;
      estimatedDuration: string;
      recommendation: string;
    } | null;
    storytelling: {
      techniques: Array<{
        name: string;
        detected: boolean;
        examples: string[];
        effectiveness: string;
        suggestion?: string;
      }>;
    } | null;
    hooks: {
      found: Array<{
        type: string;
        text: string;
        position: string;
        strength: string;
        technique: string;
      }>;
      missing: string[];
    } | null;
    improvements: Array<{
      category: string;
      current?: string;
      improved?: string;
      issue?: string;
      solution?: string;
      reason: string;
    }> | null;
    planningNotes: {
      targetAudience: string;
      contentTone: string;
      visualRecommendations: string[];
      editingNotes: string[];
      thumbnailIdeas: string[];
    } | null;
  };
  totalCharacters: number;
  estimatedDuration: string | null;
  analysisModel: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  manual: { label: '직접 입력', color: 'bg-gray-500' },
  'youtube-caption': { label: 'YouTube 자막', color: 'bg-red-500' },
  whisper: { label: 'Whisper', color: 'bg-purple-500' },
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export default function ScriptAnalysisHistoryPage() {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchRecords = async (offset = 0, searchQuery = '') => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
      });
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const res = await fetch(`/api/script/structure-analysis?${params}`);
      const data = await res.json();

      if (data.success) {
        if (offset === 0) {
          setRecords(data.data);
        } else {
          setRecords((prev) => [...prev, ...data.data]);
        }
        setPagination(data.pagination);
      } else {
        setError(data.error || '데이터를 불러오는데 실패했습니다.');
      }
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords(0, search);
  };

  const handleLoadMore = () => {
    if (pagination) {
      fetchRecords(pagination.offset + pagination.limit, search);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 분석 기록을 삭제하시겠습니까?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/script/structure-analysis?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        if (selectedRecord?.id === id) {
          setSelectedRecord(null);
        }
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* 헤더 */}
      <header className="border-b border-[#2a2a2a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-sm text-[#888888] mb-1">
              <Link href="/script-analysis" className="hover:text-white">
                대본 구조 분석
              </Link>
              <span>/</span>
              <span className="text-white">분석 기록</span>
            </div>
            <h1 className="text-xl font-semibold">대본 구조 분석 기록</h1>
          </div>
          <Link
            href="/script-analysis"
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors"
          >
            + 새 분석
          </Link>
        </div>
      </header>

      <main className="p-6">
        {/* 검색 */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="제목 또는 대본 내용으로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555555] focus:outline-none focus:border-[#444444]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-[#e0e0e0] disabled:bg-[#333333] disabled:text-[#666666] transition-colors"
            >
              검색
            </button>
          </form>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 로딩 */}
        {loading && records.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && records.length === 0 && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-12 text-center">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">저장된 분석 기록이 없습니다</h3>
            <p className="text-[#888888] mb-6">
              대본을 분석한 후 &apos;DB에 저장&apos; 버튼을 눌러 기록을 저장하세요.
            </p>
            <Link
              href="/script-analysis"
              className="inline-block px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-[#e0e0e0] transition-colors"
            >
              대본 분석하기
            </Link>
          </div>
        )}

        {/* 기록 목록 */}
        {records.length > 0 && (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#444444] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* 왼쪽: 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs text-white ${
                          sourceLabels[record.scriptSource]?.color || 'bg-gray-500'
                        }`}
                      >
                        {sourceLabels[record.scriptSource]?.label || record.scriptSource}
                      </span>
                      {record.youtubeVideoId && (
                        <a
                          href={`https://youtube.com/watch?v=${record.youtubeVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>🔗</span> 원본영상
                        </a>
                      )}
                      <span className="text-xs text-[#555555]">ID: {record.id}</span>
                    </div>

                    <h3 className="text-white font-medium mb-1 line-clamp-1">
                      {record.title || '제목 없음'}
                    </h3>

                    <p className="text-sm text-[#888888] line-clamp-2 mb-3">
                      {truncateText(record.originalScript, 200)}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-[#666666]">
                      <span>{record.totalCharacters.toLocaleString()}자</span>
                      {record.estimatedDuration && <span>{record.estimatedDuration}</span>}
                      <span>{record.analysisModel}</span>
                      <span>{formatDate(record.createdAt)}</span>
                    </div>
                  </div>

                  {/* 오른쪽: 액션 버튼 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="px-3 py-1.5 border border-[#2a2a2a] rounded text-sm text-white hover:bg-[#2a2a2a] transition-colors"
                    >
                      상세보기
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      disabled={deleting === record.id}
                      className="px-3 py-1.5 border border-red-500/30 rounded text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                    >
                      {deleting === record.id ? '삭제 중...' : '삭제'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 더 보기 */}
        {pagination?.hasMore && (
          <div className="text-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-6 py-2.5 border border-[#2a2a2a] rounded-lg text-white hover:bg-[#1a1a1a] disabled:opacity-50 transition-colors"
            >
              {loading ? '로딩 중...' : '더 보기'}
            </button>
          </div>
        )}

        {/* 상세 모달 */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedRecord.title || '대본 구조 분석'}
                  </h2>
                  <p className="text-xs text-[#888888]">
                    {formatDate(selectedRecord.createdAt)} | {selectedRecord.totalCharacters.toLocaleString()}자
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-[#888888] hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 모달 내용 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 메타 정보 */}
                <div className="flex items-center gap-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-white ${
                      sourceLabels[selectedRecord.scriptSource]?.color || 'bg-gray-500'
                    }`}
                  >
                    {sourceLabels[selectedRecord.scriptSource]?.label || selectedRecord.scriptSource}
                  </span>
                  {selectedRecord.youtubeVideoId && (
                    <a
                      href={`https://youtube.com/watch?v=${selectedRecord.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <span>▶️</span> YouTube에서 보기
                    </a>
                  )}
                  {selectedRecord.estimatedDuration && (
                    <span className="text-[#888888]">예상 길이: {selectedRecord.estimatedDuration}</span>
                  )}
                </div>

                {/* 1. 대본 구성 */}
                {selectedRecord.analysis.structure?.sections && (
                  <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                    <h3 className="text-base font-semibold mb-3 text-white">1. 대본 구성 분석</h3>
                    <div className="space-y-2">
                      {selectedRecord.analysis.structure.sections.map((section, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-white">{section.name}</span>
                          <span className="text-[#888888]">
                            {section.startChar}~{section.endChar}자
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. 글자 수 분석 */}
                {selectedRecord.analysis.characterCount && (
                  <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                    <h3 className="text-base font-semibold mb-3 text-white">2. 섹션별 글자 수</h3>
                    <div className="mb-3 text-sm text-[#888888]">
                      전체: {selectedRecord.analysis.characterCount.total?.toLocaleString()}자 | 예상 길이: {selectedRecord.analysis.characterCount.estimatedDuration}
                    </div>
                    <div className="space-y-2">
                      {selectedRecord.analysis.characterCount.bySection?.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm text-white w-20">{s.section}</span>
                          <div className="flex-1 bg-[#2a2a2a] rounded-full h-2">
                            <div
                              className="bg-white rounded-full h-2"
                              style={{ width: `${s.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#888888] w-20 text-right">
                            {s.count}자 ({s.percentage?.toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                    {selectedRecord.analysis.characterCount.recommendation && (
                      <p className="mt-3 text-xs text-[#888888]">
                        {selectedRecord.analysis.characterCount.recommendation}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. 스토리텔링 기법 */}
                {selectedRecord.analysis.storytelling?.techniques && (
                  <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                    <h3 className="text-base font-semibold mb-3 text-white">3. 스토리텔링 기법</h3>
                    <div className="space-y-3">
                      {selectedRecord.analysis.storytelling.techniques.map((t, i) => (
                        <div key={i} className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={t.detected ? 'text-white' : 'text-[#555555]'}>
                              {t.detected ? '●' : '○'} {t.name}
                            </span>
                            <span className="text-xs text-[#888888]">({t.effectiveness})</span>
                          </div>
                          {t.examples?.length > 0 && (
                            <p className="text-xs text-[#888888] ml-4">
                              예시: {t.examples.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. 후킹 포인트 */}
                {selectedRecord.analysis.hooks?.found && (
                  <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                    <h3 className="text-base font-semibold mb-3 text-white">4. 후킹 포인트</h3>
                    <div className="space-y-3">
                      {selectedRecord.analysis.hooks.found.map((h, i) => (
                        <div key={i} className="text-sm border-l-2 border-white pl-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{h.type}</span>
                            <span className="text-xs text-[#888888]">({h.position})</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                h.strength === '강함'
                                  ? 'bg-white text-black'
                                  : h.strength === '중간'
                                  ? 'bg-[#444444] text-white'
                                  : 'bg-[#2a2a2a] text-[#888888]'
                              }`}
                            >
                              {h.strength}
                            </span>
                          </div>
                          <p className="text-[#888888] text-xs">&quot;{h.text}&quot;</p>
                        </div>
                      ))}
                    </div>
                    {selectedRecord.analysis.hooks.missing?.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
                        <p className="text-xs text-[#888888] mb-2">누락된 훅:</p>
                        {selectedRecord.analysis.hooks.missing.map((m, i) => (
                          <p key={i} className="text-xs text-[#666666]">
                            • {m}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. 개선 제안 */}
                {selectedRecord.analysis.improvements && selectedRecord.analysis.improvements.length > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                    <h3 className="text-base font-semibold mb-3 text-white">5. 개선 제안</h3>
                    <div className="space-y-4">
                      {selectedRecord.analysis.improvements.map((imp, i) => (
                        <div key={i} className="text-sm">
                          <p className="text-white font-medium mb-2">{imp.category}</p>
                          {imp.current && (
                            <div className="bg-[#0a0a0a] rounded p-2 mb-2">
                              <span className="text-xs text-[#888888]">현재: </span>
                              <span className="text-xs text-[#666666]">{imp.current}</span>
                            </div>
                          )}
                          {imp.improved && (
                            <div className="bg-[#0a0a0a] rounded p-2 mb-2 border-l-2 border-white">
                              <span className="text-xs text-[#888888]">개선: </span>
                              <span className="text-xs text-white">{imp.improved}</span>
                            </div>
                          )}
                          <p className="text-xs text-[#666666]">→ {imp.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. 기획 참고사항 */}
                {selectedRecord.analysis.planningNotes && (
                  <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                    <h3 className="text-base font-semibold mb-3 text-white">6. 영상 기획 참고사항</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-[#888888]">타겟 오디언스: </span>
                        <span className="text-white">{selectedRecord.analysis.planningNotes.targetAudience}</span>
                      </div>
                      <div>
                        <span className="text-[#888888]">콘텐츠 톤: </span>
                        <span className="text-white">{selectedRecord.analysis.planningNotes.contentTone}</span>
                      </div>
                      {selectedRecord.analysis.planningNotes.visualRecommendations?.length > 0 && (
                        <div>
                          <p className="text-[#888888] mb-1">비주얼 추천:</p>
                          {selectedRecord.analysis.planningNotes.visualRecommendations.map((v, i) => (
                            <p key={i} className="text-xs text-white ml-2">
                              • {v}
                            </p>
                          ))}
                        </div>
                      )}
                      {selectedRecord.analysis.planningNotes.thumbnailIdeas?.length > 0 && (
                        <div>
                          <p className="text-[#888888] mb-1">썸네일 아이디어:</p>
                          {selectedRecord.analysis.planningNotes.thumbnailIdeas.map((t, i) => (
                            <p key={i} className="text-xs text-white ml-2">
                              • {t}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 원본 대본 */}
                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                  <h3 className="text-base font-semibold mb-3 text-white">원본 대본</h3>
                  <pre className="text-xs text-[#888888] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedRecord.originalScript}
                  </pre>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="p-4 border-t border-[#2a2a2a] flex justify-end gap-2">
                <button
                  onClick={() => handleDelete(selectedRecord.id)}
                  disabled={deleting === selectedRecord.id}
                  className="px-4 py-2 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  {deleting === selectedRecord.id ? '삭제 중...' : '삭제'}
                </button>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-[#e0e0e0] transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
