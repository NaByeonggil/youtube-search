'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Input, Select } from '@/components/ui';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    keyword: '',
    contentFormat: 'long',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.projectName.trim() || !formData.keyword.trim()) {
      setError('프로젝트명과 키워드를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/projects/${data.data.id}`);
      } else {
        setError(data.error || '프로젝트 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('프로젝트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">새 프로젝트</h1>
        <p className="mt-1 text-sm text-gray-500">
          YouTube 콘텐츠 자동화 프로젝트를 생성합니다.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="프로젝트명"
              placeholder="예: 2024 여행 콘텐츠"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              required
            />

            <Input
              label="검색 키워드"
              placeholder="예: 제주도 여행 브이로그"
              value={formData.keyword}
              onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              helperText="YouTube에서 검색할 키워드를 입력하세요."
              required
            />

            <Select
              label="콘텐츠 포맷"
              value={formData.contentFormat}
              onChange={(e) => setFormData({ ...formData, contentFormat: e.target.value })}
              options={[
                { value: 'long', label: '롱폼 (5-10분)' },
                { value: 'short', label: '숏폼 (60초 이내)' },
              ]}
            />

            {/* Format Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                {formData.contentFormat === 'short' ? '숏폼' : '롱폼'} 특징
              </h4>
              {formData.contentFormat === 'short' ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 영상 길이: 60초 이내</li>
                  <li>• 비율: 9:16 (세로형)</li>
                  <li>• 해상도: 1080x1920</li>
                  <li>• 이미지: 3-5장</li>
                  <li>• 음성: 에너지 높은 톤, 빠른 속도</li>
                </ul>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 영상 길이: 5-10분</li>
                  <li>• 비율: 16:9 (가로형)</li>
                  <li>• 해상도: 1920x1080</li>
                  <li>• 이미지: 8-15장</li>
                  <li>• 음성: 차분하고 신뢰감 있는 톤</li>
                </ul>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              취소
            </Button>
            <Button type="submit" loading={loading}>
              프로젝트 생성
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
