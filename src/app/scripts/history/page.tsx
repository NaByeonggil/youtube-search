'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';

interface ScriptRecord {
  id: number;
  videoId: number;
  youtubeVideoId: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl: string;
  projectName: string;
  scriptPurpose: string;
  targetAudience: string;
  expectedDurationSeconds: number;
  fullScript: string;
  hookText: string;
  introText: string;
  bodyText: string;
  conclusionText: string;
  contentFormat: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}분 ${secs}초` : `${mins}분`;
}

export default function ScriptsHistoryPage() {
  const [records, setRecords] = useState<ScriptRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<ScriptRecord | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchRecords = async (offset = 0, searchQuery = '', format = '') => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);
      if (format) params.append('format', format);

      const res = await fetch(`/api/scripts?${params}`);
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
    fetchRecords(0, search, formatFilter);
  };

  const handleFormatChange = (format: string) => {
    setFormatFilter(format);
    fetchRecords(0, search, format);
  };

  const handleLoadMore = () => {
    if (pagination) {
      fetchRecords(pagination.offset + pagination.limit, search, formatFilter);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 대본을 삭제하시겠습니까?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/scripts/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setRecords(prev => prev.filter(r => r.id !== id));
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

  const copyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    alert('대본이 클립보드에 복사되었습니다!');
  };

  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2">
          <Link href="/scripts" className="hover:text-white">대본 생성</Link>
          <span>/</span>
          <span className="text-white">불러오기</span>
        </div>
        <h1 className="text-2xl font-bold text-white">저장된 대본</h1>
        <p className="text-slate-400 mt-1">이전에 저장한 대본을 확인하고 관리합니다.</p>
      </div>

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="대본 내용, 영상 제목으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 포맷 필터 */}
            <select
              value={formatFilter}
              onChange={(e) => handleFormatChange(e.target.value)}
              className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">전체 형식</option>
              <option value="long">롱폼</option>
              <option value="short">숏폼</option>
            </select>

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
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-white mb-2">저장된 대본이 없습니다</h3>
            <p className="text-slate-400 mb-4">
              대본 생성 후 저장하기를 눌러 대본을 저장하세요.
            </p>
            <Link href="/scripts">
              <Button>
                <span className="mr-2">📝</span>
                대본 생성하기
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
                    src={record.thumbnailUrl || (record.youtubeVideoId ? `https://img.youtube.com/vi/${record.youtubeVideoId}/mqdefault.jpg` : '/placeholder-video.svg')}
                    alt={record.videoTitle || '영상 썸네일'}
                    className="w-full aspect-video object-cover rounded-t-lg"
                  />
                  {/* 형식 배지 */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      record.contentFormat === 'short'
                        ? 'bg-pink-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}>
                      {record.contentFormat === 'short' ? '숏폼' : '롱폼'}
                    </span>
                  </div>
                  {/* 길이 */}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
                    {formatDuration(record.expectedDurationSeconds)}
                  </div>
                </div>

                <div className="p-4">
                  {/* 제목/주제 */}
                  <h3 className="text-sm font-medium text-white line-clamp-2 mb-1">
                    {record.scriptPurpose || record.videoTitle || '제목 없음'}
                  </h3>
                  <p className="text-xs text-slate-400 mb-1">{record.projectName}</p>
                  {record.youtubeVideoId && (
                    <a
                      href={`https://youtube.com/watch?v=${record.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1 mb-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>🔗</span> 원본영상 보기
                    </a>
                  )}

                  {/* 훅 미리보기 */}
                  {record.hookText && (
                    <div className="bg-slate-700/50 rounded-lg p-2 mb-3">
                      <p className="text-xs text-purple-400 mb-1">🎣 훅</p>
                      <p className="text-xs text-slate-300 line-clamp-2">{record.hookText}</p>
                    </div>
                  )}

                  {/* 통계 */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>{record.wordCount}자</span>
                    <span>{record.targetAudience || '일반 시청자'}</span>
                  </div>

                  {/* 날짜 */}
                  <div className="text-xs text-slate-500">
                    {formatDate(record.createdAt)}
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
                    <th className="px-4 py-3 font-medium">대본</th>
                    <th className="px-4 py-3 font-medium text-center">형식</th>
                    <th className="px-4 py-3 font-medium text-center">길이</th>
                    <th className="px-4 py-3 font-medium text-center">글자수</th>
                    <th className="px-4 py-3 font-medium">생성일</th>
                    <th className="px-4 py-3 font-medium text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <img
                            src={record.thumbnailUrl || (record.youtubeVideoId ? `https://img.youtube.com/vi/${record.youtubeVideoId}/mqdefault.jpg` : '/placeholder-video.svg')}
                            alt={record.videoTitle || '영상 썸네일'}
                            className="w-20 h-12 object-cover rounded"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white line-clamp-1">
                              {record.scriptPurpose || record.videoTitle || '제목 없음'}
                            </p>
                            <p className="text-xs text-slate-400">{record.projectName}</p>
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
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          record.contentFormat === 'short'
                            ? 'bg-pink-500/20 text-pink-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {record.contentFormat === 'short' ? '숏폼' : '롱폼'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-white">
                        {formatDuration(record.expectedDurationSeconds)}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">
                        {record.wordCount}자
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRecord(record)}
                          >
                            보기
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(record.id);
                            }}
                            disabled={deleting === record.id}
                            className="text-red-400 hover:text-red-300"
                          >
                            {deleting === record.id ? '...' : '삭제'}
                          </Button>
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
              <h2 className="text-lg font-semibold text-white">대본 상세</h2>
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
                  src={selectedRecord.thumbnailUrl || (selectedRecord.youtubeVideoId ? `https://img.youtube.com/vi/${selectedRecord.youtubeVideoId}/mqdefault.jpg` : '/placeholder-video.svg')}
                  alt={selectedRecord.videoTitle || '영상 썸네일'}
                  className="w-48 h-28 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      selectedRecord.contentFormat === 'short'
                        ? 'bg-pink-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}>
                      {selectedRecord.contentFormat === 'short' ? '숏폼' : '롱폼'}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {formatDuration(selectedRecord.expectedDurationSeconds)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {selectedRecord.scriptPurpose || selectedRecord.videoTitle || '제목 없음'}
                  </h3>
                  <p className="text-slate-400 text-sm mb-1">{selectedRecord.projectName}</p>
                  {selectedRecord.youtubeVideoId && (
                    <a
                      href={`https://youtube.com/watch?v=${selectedRecord.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors mb-2"
                    >
                      <span>▶️</span> YouTube에서 보기
                    </a>
                  )}
                  <p className="text-slate-500 text-sm">
                    타겟: {selectedRecord.targetAudience || '일반 시청자'} | {selectedRecord.wordCount}자
                  </p>
                </div>
              </div>

              {/* 대본 구조 */}
              <div className="space-y-4">
                {selectedRecord.hookText && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="text-purple-400 font-semibold mb-2">🎣 훅 (오프닝)</h4>
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedRecord.hookText}</p>
                  </div>
                )}

                {selectedRecord.introText && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-400 font-semibold mb-2">📖 도입부</h4>
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedRecord.introText}</p>
                  </div>
                )}

                {selectedRecord.bodyText && (
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">📝 본론</h4>
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedRecord.bodyText}</p>
                  </div>
                )}

                {selectedRecord.conclusionText && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <h4 className="text-green-400 font-semibold mb-2">🎬 결론</h4>
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedRecord.conclusionText}</p>
                  </div>
                )}
              </div>

              {/* 전체 대본 */}
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold">전체 대본</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyScript(selectedRecord.fullScript)}
                  >
                    📋 복사
                  </Button>
                </div>
                <pre className="text-slate-300 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {selectedRecord.fullScript}
                </pre>
              </div>

              {/* 메타 정보 */}
              <div className="text-xs text-slate-500 pt-4 border-t border-slate-700">
                <p>생성일: {formatDate(selectedRecord.createdAt)}</p>
                {selectedRecord.updatedAt !== selectedRecord.createdAt && (
                  <p>수정일: {formatDate(selectedRecord.updatedAt)}</p>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => copyScript(selectedRecord.fullScript)}
                >
                  📋 대본 복사
                </Button>
                <Button
                  variant="outline"
                  className="text-red-400 border-red-400 hover:bg-red-400/10"
                  onClick={() => {
                    handleDelete(selectedRecord.id);
                  }}
                  disabled={deleting === selectedRecord.id}
                >
                  {deleting === selectedRecord.id ? '삭제 중...' : '🗑️ 삭제'}
                </Button>
                <Button onClick={() => setSelectedRecord(null)}>
                  닫기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
