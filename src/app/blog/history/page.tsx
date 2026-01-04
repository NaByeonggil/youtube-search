'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';

interface BlogSection {
  heading: string;
  content: string;
}

interface BlogRecord {
  id: number;
  sourceVideoId: string;
  sourceVideoTitle: string;
  sourceChannelName: string;
  ideaTitle: string;
  ideaDescription: string;
  ideaTargetAudience: string;
  blogTitle: string;
  metaDescription: string;
  introduction: string;
  sections: BlogSection[];
  conclusion: string;
  tags: string[];
  estimatedReadTime: string;
  customTarget: string;
  toneAndManner: string;
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

export default function BlogHistoryPage() {
  const [records, setRecords] = useState<BlogRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<BlogRecord | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<BlogRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRecords = async (offset = 0, searchQuery = '') => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/blog?${params}`);
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

  const handleDelete = async (id: number) => {
    if (!confirm('이 블로그를 삭제하시겠습니까?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/blog/${id}`, { method: 'DELETE' });
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

  const copyBlog = (record: BlogRecord) => {
    const fullText = `# ${record.blogTitle}

${record.introduction}

${record.sections?.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n') || ''}

${record.conclusion}

---
태그: ${record.tags?.join(', ') || ''}
`;
    navigator.clipboard.writeText(fullText);
    alert('블로그가 클립보드에 복사되었습니다!');
  };

  const handleEdit = (record: BlogRecord) => {
    setEditingRecord({ ...record });
    setSelectedRecord(null);
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/blog/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogTitle: editingRecord.blogTitle,
          metaDescription: editingRecord.metaDescription,
          introduction: editingRecord.introduction,
          sections: editingRecord.sections,
          conclusion: editingRecord.conclusion,
          tags: editingRecord.tags,
          estimatedReadTime: editingRecord.estimatedReadTime,
          customTarget: editingRecord.customTarget,
          toneAndManner: editingRecord.toneAndManner,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setRecords(prev =>
          prev.map(r => (r.id === editingRecord.id ? data.data : r))
        );
        setEditingRecord(null);
        alert('블로그가 수정되었습니다.');
      } else {
        alert(data.error || '수정에 실패했습니다.');
      }
    } catch {
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const updateEditingSection = (index: number, field: 'heading' | 'content', value: string) => {
    if (!editingRecord) return;
    const newSections = [...editingRecord.sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setEditingRecord({ ...editingRecord, sections: newSections });
  };

  const addSection = () => {
    if (!editingRecord) return;
    setEditingRecord({
      ...editingRecord,
      sections: [...editingRecord.sections, { heading: '', content: '' }],
    });
  };

  const removeSection = (index: number) => {
    if (!editingRecord) return;
    const newSections = editingRecord.sections.filter((_, i) => i !== index);
    setEditingRecord({ ...editingRecord, sections: newSections });
  };

  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2">
          <Link href="/search" className="hover:text-white">키워드 검색</Link>
          <span>/</span>
          <span className="text-white">블로그 히스토리</span>
        </div>
        <h1 className="text-2xl font-bold text-white">저장된 블로그</h1>
        <p className="text-slate-400 mt-1">이전에 생성한 블로그를 확인하고 관리합니다.</p>
      </div>

      {/* 검색 */}
      <Card className="mb-6">
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="블로그 제목, 아이디어로 검색..."
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
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-white mb-2">저장된 블로그가 없습니다</h3>
            <p className="text-slate-400 mb-4">
              키워드 검색 후 블로그를 생성하면 자동으로 저장됩니다.
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

      {/* 카드 뷰 */}
      {viewMode === 'card' && records.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {records.map((record) => (
            <Card
              key={record.id}
              className="cursor-pointer hover:border-purple-500/50 transition-all"
              onClick={() => setSelectedRecord(record)}
            >
              <CardContent className="p-4">
                {/* 썸네일 */}
                {record.sourceVideoId && (
                  <div className="mb-3">
                    <img
                      src={`https://img.youtube.com/vi/${record.sourceVideoId}/mqdefault.jpg`}
                      alt={record.sourceVideoTitle || '썸네일'}
                      className="w-full aspect-video object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* 제목 */}
                <h3 className="text-sm font-medium text-white line-clamp-2 mb-2">
                  {record.blogTitle}
                </h3>

                {/* 원본영상 링크 */}
                {record.sourceVideoId && (
                  <a
                    href={`https://youtube.com/watch?v=${record.sourceVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1 mb-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>🔗</span> {record.sourceVideoTitle || '원본영상'}
                  </a>
                )}

                {/* 아이디어 정보 */}
                {record.ideaTitle && (
                  <p className="text-xs text-slate-400 mb-2 line-clamp-1">
                    💡 {record.ideaTitle}
                  </p>
                )}

                {/* 메타 설명 미리보기 */}
                {record.metaDescription && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {record.metaDescription}
                  </p>
                )}

                {/* 태그 */}
                {record.tags && record.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {record.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                    {record.tags.length > 3 && (
                      <span className="text-xs text-slate-500">+{record.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* 통계 */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>{record.wordCount}자</span>
                  <span>{record.estimatedReadTime || '약 5분'}</span>
                </div>

                {/* 날짜 */}
                <div className="text-xs text-slate-500">
                  {formatDate(record.createdAt)}
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
                    <th className="px-4 py-3 font-medium">블로그 제목</th>
                    <th className="px-4 py-3 font-medium">아이디어</th>
                    <th className="px-4 py-3 font-medium text-center">글자수</th>
                    <th className="px-4 py-3 font-medium">생성일</th>
                    <th className="px-4 py-3 font-medium text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {record.sourceVideoId && (
                            <img
                              src={`https://img.youtube.com/vi/${record.sourceVideoId}/mqdefault.jpg`}
                              alt={record.sourceVideoTitle || '썸네일'}
                              className="w-20 h-12 object-cover rounded"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white line-clamp-1">
                              {record.blogTitle}
                            </p>
                            {record.sourceVideoId && (
                              <a
                                href={`https://youtube.com/watch?v=${record.sourceVideoId}`}
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
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-400 line-clamp-1">
                          {record.ideaTitle || '-'}
                        </p>
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
                              handleEdit(record);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            편집
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
              <h2 className="text-lg font-semibold text-white">블로그 상세</h2>
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
              {/* 원본 영상 정보 */}
              {selectedRecord.sourceVideoId && (
                <div className="flex items-start gap-4 bg-slate-700/50 rounded-lg p-4">
                  <img
                    src={`https://img.youtube.com/vi/${selectedRecord.sourceVideoId}/mqdefault.jpg`}
                    alt={selectedRecord.sourceVideoTitle || '썸네일'}
                    className="w-40 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-400 mb-1">원본 영상</h4>
                    <p className="text-white font-medium mb-1">{selectedRecord.sourceVideoTitle || '제목 없음'}</p>
                    <p className="text-sm text-slate-400 mb-2">{selectedRecord.sourceChannelName}</p>
                    <a
                      href={`https://youtube.com/watch?v=${selectedRecord.sourceVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <span>▶️</span> YouTube에서 보기
                    </a>
                  </div>
                </div>
              )}

              {/* 블로그 제목 */}
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{selectedRecord.blogTitle}</h1>
                {selectedRecord.metaDescription && (
                  <p className="text-slate-400">{selectedRecord.metaDescription}</p>
                )}
              </div>

              {/* 아이디어 정보 */}
              {selectedRecord.ideaTitle && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">💡 원본 아이디어</h4>
                  <p className="text-white font-medium">{selectedRecord.ideaTitle}</p>
                  {selectedRecord.ideaDescription && (
                    <p className="text-slate-300 text-sm mt-1">{selectedRecord.ideaDescription}</p>
                  )}
                  {selectedRecord.ideaTargetAudience && (
                    <p className="text-slate-400 text-sm mt-2">타겟: {selectedRecord.ideaTargetAudience}</p>
                  )}
                </div>
              )}

              {/* 생성 옵션 */}
              {(selectedRecord.customTarget || selectedRecord.toneAndManner) && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">생성 옵션</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedRecord.customTarget && (
                      <div>
                        <span className="text-slate-400">타겟:</span>
                        <span className="text-white ml-2">{selectedRecord.customTarget}</span>
                      </div>
                    )}
                    {selectedRecord.toneAndManner && (
                      <div>
                        <span className="text-slate-400">톤앤매너:</span>
                        <span className="text-white ml-2">{selectedRecord.toneAndManner}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 서론 */}
              {selectedRecord.introduction && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">서론</h4>
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedRecord.introduction}</p>
                </div>
              )}

              {/* 본문 섹션들 */}
              {selectedRecord.sections && selectedRecord.sections.length > 0 && (
                <div className="space-y-4">
                  {selectedRecord.sections.map((section, idx) => (
                    <div key={idx} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">{section.heading}</h4>
                      <p className="text-slate-300 whitespace-pre-wrap">{section.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 결론 */}
              {selectedRecord.conclusion && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-2">결론</h4>
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedRecord.conclusion}</p>
                </div>
              )}

              {/* 태그 */}
              {selectedRecord.tags && selectedRecord.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedRecord.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-slate-700 text-slate-300 text-sm rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 메타 정보 */}
              <div className="text-xs text-slate-500 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <span>생성일: {formatDate(selectedRecord.createdAt)}</span>
                  <span>{selectedRecord.wordCount}자 | {selectedRecord.estimatedReadTime || '약 5분'}</span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => copyBlog(selectedRecord)}
                >
                  📋 블로그 복사
                </Button>
                <Button
                  variant="outline"
                  className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                  onClick={() => handleEdit(selectedRecord)}
                >
                  ✏️ 편집
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

      {/* 편집 모달 */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">블로그 편집</h2>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 블로그 제목 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  블로그 제목 *
                </label>
                <input
                  type="text"
                  value={editingRecord.blogTitle}
                  onChange={(e) => setEditingRecord({ ...editingRecord, blogTitle: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  placeholder="블로그 제목을 입력하세요"
                />
              </div>

              {/* 메타 설명 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  메타 설명
                </label>
                <textarea
                  value={editingRecord.metaDescription || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, metaDescription: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="검색 엔진에 표시될 설명을 입력하세요"
                />
              </div>

              {/* 서론 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  서론
                </label>
                <textarea
                  value={editingRecord.introduction || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, introduction: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="서론을 입력하세요"
                />
              </div>

              {/* 본문 섹션들 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-300">본문 섹션</label>
                  <Button size="sm" variant="outline" onClick={addSection}>
                    + 섹션 추가
                  </Button>
                </div>
                <div className="space-y-4">
                  {editingRecord.sections?.map((section, idx) => (
                    <div key={idx} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-400">섹션 {idx + 1}</span>
                        <button
                          onClick={() => removeSection(idx)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          삭제
                        </button>
                      </div>
                      <input
                        type="text"
                        value={section.heading}
                        onChange={(e) => updateEditingSection(idx, 'heading', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 mb-3"
                        placeholder="섹션 제목"
                      />
                      <textarea
                        value={section.content}
                        onChange={(e) => updateEditingSection(idx, 'content', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                        placeholder="섹션 내용"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 결론 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  결론
                </label>
                <textarea
                  value={editingRecord.conclusion || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, conclusion: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="결론을 입력하세요"
                />
              </div>

              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={editingRecord.tags?.join(', ') || ''}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  placeholder="태그1, 태그2, 태그3"
                />
              </div>

              {/* 생성 옵션 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    타겟 독자
                  </label>
                  <input
                    type="text"
                    value={editingRecord.customTarget || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, customTarget: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="타겟 독자"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    톤앤매너
                  </label>
                  <input
                    type="text"
                    value={editingRecord.toneAndManner || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, toneAndManner: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="톤앤매너"
                  />
                </div>
              </div>

              {/* 예상 읽기 시간 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  예상 읽기 시간
                </label>
                <input
                  type="text"
                  value={editingRecord.estimatedReadTime || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, estimatedReadTime: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  placeholder="예: 약 5분"
                />
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => setEditingRecord(null)}
                  disabled={saving}
                >
                  취소
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={saving || !editingRecord.blogTitle.trim()}
                >
                  {saving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
