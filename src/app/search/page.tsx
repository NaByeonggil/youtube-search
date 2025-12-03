'use client';

import React, { useState } from 'react';
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

          {/* 결과 테이블 */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                검색 결과 ({results.length}개)
              </h2>
            </div>
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
                            src={video.thumbnailUrl}
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
                        <button
                          onClick={() => handleAnalyze(video)}
                          disabled={analyzing === video.videoId}
                          className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {analyzing === video.videoId ? '이동 중...' : '분석하기'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </div>
  );
}
