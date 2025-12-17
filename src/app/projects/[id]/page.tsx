'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Badge, LoadingSpinner, Modal } from '@/components/ui';
import { formatNumber, formatRelativeTime, formatDate, getStatusColor, getStatusLabel, getGradeColor, getGradeLabel } from '@/lib/utils';

interface Project {
  id: number;
  project_name: string;
  keyword: string;
  content_format: 'short' | 'long';
  status: string;
  created_at: string;
  videos: Video[];
}

interface Video {
  id: number;
  video_id: string;
  title: string;
  channel_name: string;
  view_count: number;
  subscriber_count: number;
  viral_score: number;
  viral_grade: string;
  created_at: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string>('');

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        if (data.success) {
          setProject(data.data);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [projectId]);

  const handleRunPipeline = async () => {
    if (!selectedVideo) {
      alert('분석할 영상을 선택해주세요.');
      return;
    }

    setPipelineRunning(true);
    setShowPipelineModal(false);

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          youtubeVideoId: selectedVideo,
          format: project?.content_format || 'long',
          skipImageGeneration: true, // Skip for demo (requires API key)
          skipVideoGeneration: true, // Skip for demo (requires FFmpeg)
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('파이프라인이 완료되었습니다!');
        // Refresh project data
        const refreshRes = await fetch(`/api/projects/${projectId}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setProject(refreshData.data);
        }
      } else {
        alert(`오류: ${data.error}`);
      }
    } catch (error) {
      console.error('Pipeline error:', error);
      alert('파이프라인 실행 중 오류가 발생했습니다.');
    } finally {
      setPipelineRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">프로젝트를 찾을 수 없습니다</h2>
        <Link href="/projects" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          프로젝트 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
            <Badge variant={project.content_format === 'short' ? 'warning' : 'info'}>
              {project.content_format === 'short' ? '숏폼' : '롱폼'}
            </Badge>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            키워드: {project.keyword} • 생성일: {formatDate(project.created_at)}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowPipelineModal(true)}
            disabled={pipelineRunning}
          >
            {pipelineRunning ? '실행 중...' : '파이프라인 실행'}
          </Button>
          <Button variant="danger" onClick={() => {
            if (confirm('정말로 삭제하시겠습니까?')) {
              fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
                .then(() => router.push('/projects'));
            }
          }}>
            삭제
          </Button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="text-center py-4">
            <div className="text-2xl font-bold text-gray-900">{project.videos?.length || 0}</div>
            <div className="text-sm text-gray-500">분석된 영상</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <div className="text-2xl font-bold text-green-600">
              {project.videos?.filter(v => v.viral_grade === 'S' || v.viral_grade === 'A').length || 0}
            </div>
            <div className="text-sm text-gray-500">S/A 등급</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-500">생성된 대본</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-500">생성된 영상</div>
          </CardContent>
        </Card>
      </div>

      {/* Analyzed Videos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>분석된 영상</CardTitle>
            <Link href={`/search?keyword=${encodeURIComponent(project.keyword)}&format=${project.content_format}`}>
              <Button variant="outline" size="sm">
                YouTube 검색
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!project.videos || project.videos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">아직 분석된 영상이 없습니다.</p>
              <Link href={`/search?keyword=${encodeURIComponent(project.keyword)}&format=${project.content_format}`}>
                <Button>YouTube에서 영상 검색하기</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">영상</th>
                    <th className="pb-3 font-medium text-right">조회수</th>
                    <th className="pb-3 font-medium text-right">구독자</th>
                    <th className="pb-3 font-medium text-center">터짐 지수</th>
                    <th className="pb-3 font-medium">분석일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {project.videos.map((video) => (
                    <tr key={video.id} className="hover:bg-gray-50">
                      <td className="py-4">
                        <div>
                          <a
                            href={`https://youtube.com/watch?v=${video.video_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {video.title}
                          </a>
                          <p className="text-xs text-gray-500">{video.channel_name}</p>
                        </div>
                      </td>
                      <td className="py-4 text-right text-sm text-gray-600">
                        {formatNumber(video.view_count)}
                      </td>
                      <td className="py-4 text-right text-sm text-gray-600">
                        {formatNumber(video.subscriber_count)}
                      </td>
                      <td className="py-4 text-center">
                        <Badge variant="grade" grade={video.viral_grade as any}>
                          {video.viral_grade} ({video.viral_score != null ? Number(video.viral_score).toFixed(2) : '-'})
                        </Badge>
                      </td>
                      <td className="py-4 text-sm text-gray-500">
                        {formatRelativeTime(video.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Modal */}
      <Modal
        isOpen={showPipelineModal}
        onClose={() => setShowPipelineModal(false)}
        title="파이프라인 실행"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            선택한 영상을 분석하고 콘텐츠를 자동으로 생성합니다.
          </p>

          {project.videos && project.videos.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  분석할 영상 선택
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={selectedVideo}
                  onChange={(e) => setSelectedVideo(e.target.value)}
                >
                  <option value="">영상을 선택하세요</option>
                  {project.videos.map((video) => (
                    <option key={video.id} value={video.video_id}>
                      {video.title} ({video.viral_grade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">실행 단계</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1. 댓글 수집 및 감성 분석</li>
                  <li>2. 콘텐츠 요약</li>
                  <li>3. 대본 생성</li>
                  <li>4. 이미지 프롬프트 생성</li>
                  <li>5. 이미지 생성 (DALL-E)</li>
                  <li>6. TTS 음성 생성</li>
                  <li>7. 자막 생성</li>
                  <li>8. 영상 합성 (FFmpeg)</li>
                </ul>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-4">
              먼저 YouTube 검색에서 영상을 추가해주세요.
            </p>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowPipelineModal(false)}>
              취소
            </Button>
            <Button onClick={handleRunPipeline} disabled={!selectedVideo}>
              실행
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
