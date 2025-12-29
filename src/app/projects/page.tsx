'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, LoadingSpinner } from '@/components/ui';
import { formatRelativeTime, getStatusColor, getStatusLabel } from '@/lib/utils';

interface Project {
  id: number;
  project_name: string;
  keyword: string;
  content_format: 'short' | 'long';
  status: string;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.success) {
          setProjects(data.data);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProjects(projects.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 min-h-full space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">영상 분석</h1>
          <p className="mt-1 text-sm text-slate-400">
            프로젝트별 영상 분석 및 관리
          </p>
        </div>
        <Link href="/search">
          <Button>
            <span className="mr-2">🔍</span>
            새 검색
          </Button>
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-white mb-2">프로젝트가 없습니다</h3>
            <p className="text-slate-400 mb-6">키워드 검색을 통해 새로운 프로젝트를 시작하세요.</p>
            <Link href="/search">
              <Button>
                <span className="mr-2">🔍</span>
                검색 시작하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:border-purple-500 transition-colors">
              <CardContent>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link href={`/projects/${project.id}`}>
                      <h3 className="text-lg font-semibold text-white hover:text-purple-400 transition-colors">
                        {project.project_name}
                      </h3>
                    </Link>
                    <p className="text-sm text-slate-400 mt-1">
                      키워드: {project.keyword.startsWith('chat_image_')
                        ? '채팅 이미지'
                        : project.keyword.startsWith('image_gen_')
                        ? '이미지 생성'
                        : project.keyword}
                    </p>
                  </div>
                  <Badge
                    variant={project.content_format === 'short' ? 'warning' : 'info'}
                    size="sm"
                  >
                    {project.content_format === 'short' ? '숏폼' : '롱폼'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatRelativeTime(project.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="ghost" size="sm">
                        상세
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 워크플로우 안내 */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">워크플로우 진행 상태</h3>
        <div className="grid grid-cols-9 gap-2">
          {[
            { step: 1, name: '검색', icon: '🔍' },
            { step: 2, name: '분석', icon: '📊' },
            { step: 3, name: '댓글', icon: '💬' },
            { step: 4, name: '대본', icon: '📝' },
            { step: 5, name: '캐릭터', icon: '👤' },
            { step: 6, name: '이미지', icon: '🎨' },
            { step: 7, name: '음성', icon: '🎙️' },
            { step: 8, name: '영상', icon: '🎬' },
            { step: 9, name: '업로드', icon: '📤' },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-lg mb-1">
                {item.icon}
              </div>
              <span className="text-xs text-slate-500 text-center">{item.name}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-sm text-center mt-4">
          프로젝트를 선택하면 상세 진행 상태를 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
