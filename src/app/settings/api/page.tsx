'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function ApiKeySettings() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [hasYoutube, setHasYoutube] = useState(false);
  const [hasGemini, setHasGemini] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchApiKeys();
    }
  }, [isAuthenticated]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/settings/api-keys');
      const data = await response.json();
      if (data.success) {
        setYoutubeApiKey(data.apiKeys.youtube_api_key || '');
        setGeminiApiKey(data.apiKeys.gemini_api_key || '');
        setHasYoutube(data.apiKeys.has_youtube);
        setHasGemini(data.apiKeys.has_gemini);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_api_key: youtubeApiKey,
          gemini_api_key: geminiApiKey,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'API 키가 저장되었습니다.' });
        setHasYoutube(!!youtubeApiKey);
        setHasGemini(!!geminiApiKey);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'API 키 저장에 실패했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('모든 API 키를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setYoutubeApiKey('');
        setGeminiApiKey('');
        setHasYoutube(false);
        setHasGemini(false);
        setMessage({ type: 'success', text: 'API 키가 삭제되었습니다.' });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'API 키 삭제에 실패했습니다.' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
          <Link href="/settings" className="hover:text-white">설정</Link>
          <span>/</span>
          <span className="text-white">API 키</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-white">개인 API 키 설정</h1>
        <p className="text-slate-400 text-sm mt-1">
          개인 API 키를 설정하면 시스템 API 대신 본인의 API가 사용됩니다.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-blue-400 text-lg">ℹ️</span>
          <div className="text-sm">
            <p className="text-blue-300 font-medium mb-1">개인 API 키 사용 안내</p>
            <ul className="text-blue-200/80 space-y-1">
              <li>• 개인 API 키를 설정하면 시스템 API 할당량과 별도로 사용됩니다.</li>
              <li>• YouTube Data API: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Google Cloud Console</a>에서 발급</li>
              <li>• Gemini API: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Google AI Studio</a>에서 발급 (gemini-2.0-flash-exp 사용)</li>
              <li>• API 키는 암호화되어 안전하게 저장됩니다.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`bg-slate-800 rounded-lg p-4 border ${hasYoutube ? 'border-green-500/50' : 'border-slate-700'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📺</span>
            <div>
              <p className="text-white font-medium">YouTube Data API</p>
              <p className={`text-sm ${hasYoutube ? 'text-green-400' : 'text-slate-400'}`}>
                {hasYoutube ? '✓ 설정됨' : '미설정'}
              </p>
            </div>
          </div>
        </div>

        <div className={`bg-slate-800 rounded-lg p-4 border ${hasGemini ? 'border-green-500/50' : 'border-slate-700'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <p className="text-white font-medium">Gemini API</p>
              <p className={`text-sm ${hasGemini ? 'text-green-400' : 'text-slate-400'}`}>
                {hasGemini ? '✓ 설정됨' : '미설정'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-white font-medium">API 키 입력</h2>
        </div>

        {isLoadingKeys ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-4 space-y-4">
            {message && (
              <div className={`rounded-lg p-3 ${
                message.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/50'
                  : 'bg-red-500/10 border border-red-500/50'
              }`}>
                <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'} >
                  {message.text}
                </p>
              </div>
            )}

            {/* YouTube API Key */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                YouTube Data API 키
              </label>
              <div className="relative">
                <input
                  type={showYoutubeKey ? 'text' : 'password'}
                  value={youtubeApiKey}
                  onChange={(e) => setYoutubeApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showYoutubeKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                YouTube 검색 및 영상 정보 조회에 사용됩니다.
              </p>
            </div>

            {/* Gemini API Key */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Gemini API 키 (gemini-3.6-flash)
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showGeminiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                댓글 분석, 대본 생성, 이미지 프롬프트 생성에 사용됩니다.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-slate-600 transition-colors"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                전체 삭제
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-white font-medium">API 키 발급 가이드</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-white font-medium mb-2">📺 YouTube Data API</h3>
            <ol className="text-slate-300 text-sm space-y-1 list-decimal list-inside">
              <li>Google Cloud Console 접속</li>
              <li>새 프로젝트 생성 또는 기존 프로젝트 선택</li>
              <li>API 및 서비스 → 라이브러리에서 "YouTube Data API v3" 활성화</li>
              <li>사용자 인증 정보 → API 키 생성</li>
            </ol>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">✨ Gemini API</h3>
            <ol className="text-slate-300 text-sm space-y-1 list-decimal list-inside">
              <li>Google AI Studio 접속</li>
              <li>API Key 메뉴 선택</li>
              <li>Create API Key 클릭</li>
              <li>생성된 키 복사</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
