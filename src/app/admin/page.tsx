'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface ApiUsageStats {
  byApiType: { api_type: string; total_requests: number; total_tokens: number; total_cost: number }[];
  byDate: { usage_date: string; total_requests: number; total_tokens: number }[];
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading, isAdmin, logout } = useAuth();
  const [stats, setStats] = useState<ApiUsageStats | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/login');
    }
  }, [isLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchUserCount();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/api-usage?days=30');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchUserCount = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=1');
      const data = await response.json();
      if (data.success) {
        setUserCount(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch user count:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const apiTypeLabels: Record<string, string> = {
    youtube: 'YouTube API',
    gemini: 'Gemini API',
    openai: 'OpenAI API',
    imagen: 'Imagen API',
  };

  return (
    <div className="p-4 md:p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">관리자 대시보드</h1>
          <p className="text-slate-400 text-sm mt-1">
            환영합니다, {user?.name}님
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 transition-colors"
        >
          로그아웃
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">총 사용자</p>
          <p className="text-2xl font-bold text-white mt-1">{userCount}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">30일 API 요청</p>
          <p className="text-2xl font-bold text-white mt-1">
            {stats?.totalRequests.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">총 토큰 사용</p>
          <p className="text-2xl font-bold text-white mt-1">
            {stats?.totalTokens.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">예상 비용</p>
          <p className="text-2xl font-bold text-white mt-1">
            ${stats?.totalCost.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link href="/admin/users" className="block">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-purple-500 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="text-white font-medium">사용자 관리</h3>
                <p className="text-slate-400 text-sm">사용자 추가, 수정, 삭제</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/settings/api" className="block">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-purple-500 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔑</span>
              </div>
              <div>
                <h3 className="text-white font-medium">API 키 설정</h3>
                <p className="text-slate-400 text-sm">개인 API 키 관리</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/" className="block">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-purple-500 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
              <div>
                <h3 className="text-white font-medium">대시보드</h3>
                <p className="text-slate-400 text-sm">메인 화면으로 이동</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* API Usage by Type */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 mb-6">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-white font-medium">API 사용량 (30일)</h2>
        </div>
        <div className="p-4">
          {isLoadingStats ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
            </div>
          ) : stats?.byApiType && stats.byApiType.length > 0 ? (
            <div className="space-y-3">
              {stats.byApiType.map((item) => (
                <div key={item.api_type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {item.api_type === 'youtube' ? '📺' :
                       item.api_type === 'gemini' ? '✨' :
                       item.api_type === 'openai' ? '🤖' : '🎨'}
                    </span>
                    <span className="text-white">{apiTypeLabels[item.api_type] || item.api_type}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{item.total_requests.toLocaleString()} 요청</p>
                    <p className="text-slate-400 text-sm">{item.total_tokens.toLocaleString()} 토큰</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">API 사용 기록이 없습니다.</p>
          )}
        </div>
      </div>

      {/* Recent Usage by Date */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-white font-medium">일별 사용량</h2>
        </div>
        <div className="p-4 overflow-x-auto">
          {stats?.byDate && stats.byDate.length > 0 ? (
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="text-left text-slate-400 text-sm">
                  <th className="pb-3">날짜</th>
                  <th className="pb-3 text-right">요청 수</th>
                  <th className="pb-3 text-right">토큰 사용</th>
                </tr>
              </thead>
              <tbody className="text-white text-sm">
                {stats.byDate.slice(0, 7).map((item) => (
                  <tr key={item.usage_date} className="border-t border-slate-700">
                    <td className="py-2">{item.usage_date}</td>
                    <td className="py-2 text-right">{item.total_requests.toLocaleString()}</td>
                    <td className="py-2 text-right">{item.total_tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-400 text-center py-4">사용 기록이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
