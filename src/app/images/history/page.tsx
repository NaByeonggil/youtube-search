'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GenerationHistory {
  id: string;
  createdAt: string;
  aspectRatio: string;
  style: string;
  totalScenes: number;
  successCount: number;
  failedCount: number;
  images: {
    scene_id: number;
    imagePath?: string;
    imageBase64?: string;
  }[];
}

export default function ImageHistoryPage() {
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<GenerationHistory | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/images/history');
      const result = await response.json();
      if (result.success) {
        setHistory(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHistory = async (id: string) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/images/history/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (selectedHistory?.id === id) {
          setSelectedHistory(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete history:', error);
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

  const getStyleName = (style: string) => {
    const styles: Record<string, string> = {
      photorealistic: '실사',
      '3d': '3D',
      animation: '애니메이션',
    };
    return styles[style] || style;
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
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-white mb-2">기록이 없습니다</h2>
            <p className="text-slate-400 mb-6">이미지를 생성하면 여기에 기록됩니다.</p>
            <Link
              href="/images"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              이미지 생성하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* History List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-bold text-white mb-4">기록 목록</h2>
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedHistory(item)}
                  className={`p-4 rounded-lg cursor-pointer border transition-colors ${
                    selectedHistory?.id === item.id
                      ? 'bg-purple-900/50 border-purple-500'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {item.totalScenes}개 장면
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistory(item.id);
                      }}
                      className="text-slate-400 hover:text-red-400"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>{formatDate(item.createdAt)}</p>
                    <p>
                      {item.aspectRatio} | {getStyleName(item.style)}
                    </p>
                    <p>
                      <span className="text-green-400">✓ {item.successCount}</span>
                      {item.failedCount > 0 && (
                        <span className="text-red-400 ml-2">✗ {item.failedCount}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail View */}
            <div className="lg:col-span-2">
              {selectedHistory ? (
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {formatDate(selectedHistory.createdAt)}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {selectedHistory.aspectRatio} | {getStyleName(selectedHistory.style)} |{' '}
                        {selectedHistory.totalScenes}개 장면
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedHistory.images.map((img) => (
                      <div
                        key={img.scene_id}
                        className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative"
                      >
                        {img.imageBase64 ? (
                          <img
                            src={`data:image/png;base64,${img.imageBase64}`}
                            alt={`Scene ${img.scene_id}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                            이미지 없음
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                          Scene {img.scene_id}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center py-20">
                  <p className="text-slate-400">왼쪽에서 기록을 선택하세요</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
