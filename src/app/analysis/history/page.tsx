'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';

interface AnalysisRecord {
  id: number;
  videoId: number;
  youtubeVideoId: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl: string;
  viewCount: number;
  viralScore: number;
  viralGrade: string;
  projectName: string;
  totalCommentsAnalyzed: number;
  positiveCount: number;
  negativeCount: number;
  positiveRatio: number;
  positiveSummary: string;
  positiveKeywords: string[];
  negativeSummary: string;
  negativeKeywords: string[];
  improvementSuggestions: string;
  analysisModel: string;
  analyzedAt: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const gradeColors: Record<string, string> = {
  S: 'bg-red-500 text-white',
  A: 'bg-orange-500 text-white',
  B: 'bg-yellow-500 text-black',
  C: 'bg-green-500 text-white',
  D: 'bg-gray-500 text-white',
};

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function AnalysisHistoryPage() {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
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

      const res = await fetch(`/api/analysis/history?${params}`);
      const data = await res.json();

      if (data.success) {
        if (offset === 0) {
          setRecords(data.data);
        } else {
          setRecords(prev => [...prev, ...data.data]);
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

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('이 분석 기록을 삭제하시겠습니까?')) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/analysis/history/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setRecords(prev => prev.filter(r => r.id !== id));
        if (selectedRecord?.id === id) {
          setSelectedRecord(null);
        }
      } else {
        setError(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      setError('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2">
          <Link href="/analysis" className="hover:text-white">댓글 분석</Link>
          <span>/</span>
          <span className="text-white">불러오기</span>
        </div>
        <h1 className="text-2xl font-bold text-white">분석 기록 불러오기</h1>
        <p className="text-slate-400 mt-1">이전에 저장한 댓글 분석 결과를 확인합니다.</p>
      </div>

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="영상 제목, 채널명, 프로젝트명으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <Button type="submit" disabled={loading}>
              검색
            </Button>
            {/* 뷰 모드 토글 */}
            <div className="flex items-center space-x-1 bg-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'card'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && records.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* 결과 없음 */}
      {!loading && records.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-5xl mb-4">📂</div>
            <h3 className="text-xl font-semibold text-white mb-2">저장된 분석 기록이 없습니다</h3>
            <p className="text-slate-400 mb-4">
              댓글 분석 후 저장하기를 눌러 기록을 저장하세요.
            </p>
            <Link href="/analysis">
              <Button>
                <span className="mr-2">💬</span>
                댓글 분석하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 카드 뷰 */}
      {viewMode === 'card' && records.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {records.map((record) => (
            <Card
              key={record.id}
              className="cursor-pointer hover:border-purple-500/50 transition-all"
              onClick={() => setSelectedRecord(record)}
            >
              <CardContent className="p-0">
                {/* 썸네일 */}
                <div className="relative">
                  <img
                    src={record.thumbnailUrl || '/placeholder-video.png'}
                    alt={record.videoTitle}
                    className="w-full aspect-video object-cover rounded-t-lg"
                  />
                  {/* 등급 배지 */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColors[record.viralGrade] || 'bg-gray-500'}`}>
                      {record.viralGrade}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {/* 제목 */}
                  <h3 className="text-sm font-medium text-white line-clamp-2 mb-1">
                    {record.videoTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">{record.channelName}</p>

                  {/* 감성 분포 바 */}
                  <div className="flex h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-green-500"
                      style={{ width: `${toNumber(record.positiveRatio)}%` }}
                    />
                    <div
                      className="bg-red-500"
                      style={{ width: `${100 - toNumber(record.positiveRatio)}%` }}
                    />
                  </div>

                  {/* 통계 */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span className="text-green-400">긍정 {toNumber(record.positiveRatio).toFixed(1)}%</span>
                    <span>댓글 {record.totalCommentsAnalyzed}개</span>
                  </div>

                  {/* 분석 날짜 및 삭제 버튼 */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{formatDate(record.analyzedAt)}</span>
                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      disabled={deleting === record.id}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      {deleting === record.id ? '삭제 중...' : '🗑️ 삭제'}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 테이블 뷰 */}
      {viewMode === 'table' && records.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr className="text-left text-sm text-slate-400">
                    <th className="px-4 py-3 font-medium">영상</th>
                    <th className="px-4 py-3 font-medium text-center">댓글 수</th>
                    <th className="px-4 py-3 font-medium text-center">긍정률</th>
                    <th className="px-4 py-3 font-medium text-center">등급</th>
                    <th className="px-4 py-3 font-medium">분석일</th>
                    <th className="px-4 py-3 font-medium text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <img
                            src={record.thumbnailUrl || '/placeholder-video.png'}
                            alt={record.videoTitle}
                            className="w-20 h-12 object-cover rounded"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white line-clamp-1">
                              {record.videoTitle}
                            </p>
                            <p className="text-xs text-slate-400">{record.channelName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-white">
                        {record.totalCommentsAnalyzed}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${toNumber(record.positiveRatio) >= 70 ? 'text-green-400' : toNumber(record.positiveRatio) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {toNumber(record.positiveRatio).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColors[record.viralGrade] || 'bg-gray-500'}`}>
                          {record.viralGrade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {formatDate(record.analyzedAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRecord(record)}
                          >
                            상세보기
                          </Button>
                          <button
                            onClick={(e) => handleDelete(record.id, e)}
                            disabled={deleting === record.id}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded text-sm transition-colors disabled:opacity-50"
                          >
                            {deleting === record.id ? '...' : '삭제'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 더 보기 버튼 */}
      {pagination?.hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
            {loading ? '로딩 중...' : '더 보기'}
          </Button>
        </div>
      )}

      {/* 상세 모달 */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">분석 상세 정보</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 영상 정보 */}
              <div className="flex items-start space-x-4">
                <img
                  src={selectedRecord.thumbnailUrl || '/placeholder-video.png'}
                  alt={selectedRecord.videoTitle}
                  className="w-48 h-28 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {selectedRecord.videoTitle}
                  </h3>
                  <p className="text-slate-400 mb-2">{selectedRecord.channelName}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-slate-300">
                      조회수: {formatNumber(selectedRecord.viewCount)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColors[selectedRecord.viralGrade]}`}>
                      {selectedRecord.viralGrade} ({toNumber(selectedRecord.viralScore).toFixed(2)})
                    </span>
                  </div>
                  <div className="mt-2">
                    <a
                      href={`https://youtube.com/watch?v=${selectedRecord.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      YouTube에서 보기 →
                    </a>
                  </div>
                </div>
              </div>

              {/* 분석 요약 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{selectedRecord.totalCommentsAnalyzed}</div>
                  <div className="text-sm text-slate-400">분석된 댓글</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/30">
                  <div className="text-2xl font-bold text-green-400">{toNumber(selectedRecord.positiveRatio).toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">긍정률</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-400 mb-1">분석 모델</div>
                  <div className="text-purple-400 font-medium">{selectedRecord.analysisModel}</div>
                </div>
              </div>

              {/* 감성 분포 바 */}
              <div>
                <div className="flex h-6 rounded-lg overflow-hidden">
                  <div
                    className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${toNumber(selectedRecord.positiveRatio)}%` }}
                  >
                    {toNumber(selectedRecord.positiveRatio) > 10 && `${selectedRecord.positiveCount}개`}
                  </div>
                  <div
                    className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${100 - toNumber(selectedRecord.positiveRatio)}%` }}
                  >
                    {(100 - toNumber(selectedRecord.positiveRatio)) > 10 && `${selectedRecord.negativeCount}개`}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>긍정 {selectedRecord.positiveCount}개</span>
                  <span>부정 {selectedRecord.negativeCount}개</span>
                </div>
              </div>

              {/* 긍정적인 점 */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2 flex items-center">
                  <span className="mr-2">👍</span> 긍정적인 점
                </h4>
                <p className="text-slate-300 mb-3">{selectedRecord.positiveSummary}</p>
                {selectedRecord.positiveKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.positiveKeywords.map((kw, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 부정적인 점 */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h4 className="text-red-400 font-semibold mb-2 flex items-center">
                  <span className="mr-2">👎</span> 부정적인 점
                </h4>
                <p className="text-slate-300 mb-3">{selectedRecord.negativeSummary}</p>
                {selectedRecord.negativeKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.negativeKeywords.map((kw, idx) => (
                      <span key={idx} className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 개선 제안 */}
              {selectedRecord.improvementSuggestions && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="text-yellow-400 font-semibold mb-2 flex items-center">
                    <span className="mr-2">💡</span> 개선 제안
                  </h4>
                  <p className="text-slate-300">{selectedRecord.improvementSuggestions}</p>
                </div>
              )}

              {/* 메타 정보 */}
              <div className="text-xs text-slate-500 pt-4 border-t border-slate-700">
                <p>분석일: {formatDate(selectedRecord.analyzedAt)}</p>
                <p>프로젝트: {selectedRecord.projectName}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
