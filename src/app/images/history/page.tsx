'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ImageData {
  id: number;
  sceneId: number;
  description: string;
  imagePath: string;
  imageBase64: string;
  status: string;
}

interface SessionData {
  id: number;
  projectId: number;
  originalScript: string;
  scenes: any[];
  characters: Record<string, any>;
  aspectRatio: string;
  style: {
    name: string;
    en: string;
  };
  totalScenes: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  images: ImageData[];
}

export default function ImageHistoryPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadSessions();
  }, [page]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/images/history?page=${page}&limit=12`);
      const result = await response.json();
      if (result.success) {
        setSessions(result.data || []);
        setTotalPages(result.meta?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/images/history/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (selectedSession?.id === id) {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFirstImage = (session: SessionData) => {
    const successImage = session.images.find((img) => img.status === 'completed' && img.imageBase64);
    return successImage?.imageBase64;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/images" className="text-slate-400 hover:text-white">
                ← 이미지 생성
              </Link>
              <h1 className="text-xl font-bold text-white">생성 기록</h1>
            </div>
            <span className="text-slate-400 text-sm">
              총 {sessions.length}개 기록
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-white mb-2">기록이 없습니다</h2>
            <p className="text-slate-400 mb-6">이미지를 생성하고 저장하면 여기에 기록됩니다.</p>
            <Link
              href="/images"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              이미지 생성하기
            </Link>
          </div>
        ) : (
          <>
            {/* Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sessions.map((session) => {
                const firstImage = getFirstImage(session);
                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer group"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-slate-900 relative overflow-hidden">
                      {firstImage ? (
                        <img
                          src={`data:image/png;base64,${firstImage}`}
                          alt="Preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                          <span className="text-4xl">🖼️</span>
                        </div>
                      )}
                      {/* Overlay badges */}
                      <div className="absolute top-2 left-2 flex gap-2">
                        <span className="px-2 py-1 bg-black/70 text-white text-xs rounded-md">
                          {session.aspectRatio}
                        </span>
                        <span className="px-2 py-1 bg-purple-600/80 text-white text-xs rounded-md">
                          {session.style.name}
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <span className="px-2 py-1 bg-black/70 text-white text-xs rounded-md">
                          {session.successCount}/{session.totalScenes} 장면
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">
                            {session.totalScenes}개 장면 생성
                          </p>
                          <p className="text-slate-400 text-sm">
                            {formatDate(session.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-green-400">
                          ✓ {session.successCount} 성공
                        </span>
                        {session.failedCount > 0 && (
                          <span className="text-red-400">
                            ✗ {session.failedCount} 실패
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
                >
                  이전
                </button>
                <span className="text-slate-400 px-4">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">이미지 생성 상세</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {formatDate(selectedSession.createdAt)} | {selectedSession.aspectRatio} | {selectedSession.style.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{selectedSession.totalScenes}</div>
                  <div className="text-sm text-slate-400">총 장면</div>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{selectedSession.successCount}</div>
                  <div className="text-sm text-slate-400">성공</div>
                </div>
                <div className="bg-red-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{selectedSession.failedCount}</div>
                  <div className="text-sm text-slate-400">실패</div>
                </div>
              </div>

              {/* Images Grid */}
              <h3 className="text-lg font-semibold text-white mb-4">생성된 이미지</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedSession.images.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className={`aspect-video rounded-lg overflow-hidden relative cursor-pointer border-2 transition-all ${
                      img.status === 'completed'
                        ? 'border-transparent hover:border-purple-500'
                        : 'border-red-500/50'
                    }`}
                  >
                    {img.imageBase64 ? (
                      <img
                        src={`data:image/png;base64,${img.imageBase64}`}
                        alt={`Scene ${img.sceneId}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-500">
                        {img.status === 'failed' ? '❌ 실패' : '이미지 없음'}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs font-medium">Scene {img.sceneId}</p>
                      {img.description && (
                        <p className="text-slate-300 text-xs line-clamp-1">{img.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Original Script */}
              {selectedSession.originalScript && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">원본 대본</h3>
                  <div className="bg-slate-900 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
                      {selectedSession.originalScript}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  deleteSession(selectedSession.id, { stopPropagation: () => {} } as React.MouseEvent);
                  setSelectedSession(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                삭제
              </button>
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-slate-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {selectedImage.imageBase64 ? (
              <img
                src={`data:image/png;base64,${selectedImage.imageBase64}`}
                alt={`Scene ${selectedImage.sceneId}`}
                className="w-full h-auto rounded-lg shadow-2xl"
              />
            ) : (
              <div className="bg-slate-800 rounded-lg p-12 text-center">
                <p className="text-slate-400">이미지가 없습니다</p>
              </div>
            )}
            <div className="mt-4 text-center">
              <p className="text-white font-medium">Scene {selectedImage.sceneId}</p>
              {selectedImage.description && (
                <p className="text-slate-400 text-sm mt-1">{selectedImage.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
