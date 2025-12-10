'use client';

import { useState, useRef } from 'react';

// PRD 스펙에 따른 화면 비율
const ASPECT_RATIOS = {
  '16:9': { label: '가로형 (16:9)', description: 'YouTube, 영상용' },
  '1:1': { label: '정사각형 (1:1)', description: 'Instagram, 썸네일' },
  '9:16': { label: '세로형 (9:16)', description: 'TikTok, Reels, Shorts' },
};

// PRD 스펙에 따른 화풍
const STYLES = {
  photorealistic: {
    name: '실사',
    en: 'photorealistic',
    prefix: 'Photorealistic, ultra-detailed, professional photography style, ',
  },
  '3d': {
    name: '3D',
    en: '3D render',
    prefix: '3D rendered, Pixar-style animation, smooth shading, high-quality CGI, ',
  },
  animation: {
    name: '애니메이션',
    en: 'animation',
    prefix: '2D animation style, anime-inspired, vibrant colors, cel-shaded, ',
  },
};

interface Scene {
  scene_id: number;
  description: string;
  characters: string[];
  setting: string;
  mood: string;
  camera_angle: string;
}

interface Character {
  name: string;
  role: string;
  age: number;
  gender: string;
  face_shape: string;
  skin_tone: string;
  hair: string;
  eyes: string;
  outfit: {
    top: string;
    bottom: string;
    shoes: string;
    accessories: string;
  };
  distinctive_features: string;
}

interface GenerationResult {
  scene_id: number;
  status: 'pending' | 'generating' | 'success' | 'failed';
  imagePath?: string;
  imageBase64?: string;
  error?: string;
}

type Step = 'input' | 'settings' | 'analyzing' | 'generating' | 'complete';

export default function ScriptToImagePage() {
  const [step, setStep] = useState<Step>('input');
  const [script, setScript] = useState('');
  const [aspectRatio, setAspectRatio] = useState<keyof typeof ASPECT_RATIOS>('16:9');
  const [style, setStyle] = useState<keyof typeof STYLES>('photorealistic');
  const [maxScenes, setMaxScenes] = useState(10);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Record<string, Character>>({});
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [currentScene, setCurrentScene] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    message: string;
    projectId?: number;
    scriptId?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 대본 파일 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setScript(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 대본 분석
  const analyzeScript = async () => {
    if (!script.trim()) {
      setError('대본을 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setStep('analyzing');

    try {
      const response = await fetch('/api/images/analyze-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          maxScenes,
          style: STYLES[style],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setScenes(result.data.scenes || []);
        setCharacters(result.data.characters || {});
        setStep('generating');
      } else {
        setError(result.error || '대본 분석 중 오류가 발생했습니다.');
        setStep('settings');
      }
    } catch (err: any) {
      setError(err.message || '대본 분석 중 오류가 발생했습니다.');
      setStep('settings');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 이미지 생성 시작
  const startGeneration = async () => {
    if (scenes.length === 0) {
      setError('분석된 장면이 없습니다.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    // 결과 초기화
    const initialResults: GenerationResult[] = scenes.map((scene) => ({
      scene_id: scene.scene_id,
      status: 'pending',
    }));
    setResults(initialResults);

    // 순차적으로 이미지 생성
    for (let i = 0; i < scenes.length; i++) {
      setCurrentScene(i);

      // 상태 업데이트: 생성 중
      setResults((prev) =>
        prev.map((r, idx) =>
          idx === i ? { ...r, status: 'generating' } : r
        )
      );

      try {
        const response = await fetch('/api/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scene: scenes[i],
            characters,
            style: STYLES[style],
            aspectRatio,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, status: 'success', imageBase64: result.data.image, imagePath: result.data.path }
                : r
            )
          );
        } else {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: 'failed', error: result.error } : r
            )
          );
        }
      } catch (err: any) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: 'failed', error: err.message } : r
          )
        );
      }

      // Rate limit 대비 딜레이
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setIsGenerating(false);
    setStep('complete');
  };

  // 실패한 이미지 재시도
  const retryFailed = async () => {
    const failedIndices = results
      .map((r, idx) => (r.status === 'failed' ? idx : -1))
      .filter((idx) => idx !== -1);

    if (failedIndices.length === 0) return;

    setIsGenerating(true);

    for (const i of failedIndices) {
      setCurrentScene(i);

      setResults((prev) =>
        prev.map((r, idx) =>
          idx === i ? { ...r, status: 'generating' } : r
        )
      );

      try {
        const response = await fetch('/api/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scene: scenes[i],
            characters,
            style: STYLES[style],
            aspectRatio,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, status: 'success', imageBase64: result.data.image, imagePath: result.data.path }
                : r
            )
          );
        } else {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: 'failed', error: result.error } : r
            )
          );
        }
      } catch (err: any) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: 'failed', error: err.message } : r
          )
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setIsGenerating(false);
  };

  // 다운로드
  const downloadImage = (result: GenerationResult) => {
    if (!result.imageBase64) return;

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${result.imageBase64}`;
    link.download = `scene_${result.scene_id.toString().padStart(3, '0')}.png`;
    link.click();
  };

  // 전체 다운로드
  const downloadAll = () => {
    results
      .filter((r) => r.status === 'success' && r.imageBase64)
      .forEach((r, idx) => {
        setTimeout(() => downloadImage(r), idx * 100);
      });
  };

  // DB에 저장
  const saveToDatabase = async () => {
    if (successCount === 0) {
      setError('저장할 성공한 이미지가 없습니다.');
      return;
    }

    setIsSaving(true);
    setSaveResult(null);
    setError(null);

    try {
      const response = await fetch('/api/images/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          scenes,
          characters,
          results,
          aspectRatio,
          style: STYLES[style],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSaveResult({
          success: true,
          message: result.data.message,
          projectId: result.data.projectId,
          scriptId: result.data.scriptId,
        });
      } else {
        setSaveResult({
          success: false,
          message: result.error || 'DB 저장에 실패했습니다.',
        });
      }
    } catch (err: any) {
      setSaveResult({
        success: false,
        message: err.message || 'DB 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 새로 시작
  const reset = () => {
    setStep('input');
    setScript('');
    setScenes([]);
    setCharacters({});
    setResults([]);
    setError(null);
    setCurrentScene(0);
    setSaveResult(null);
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white truncate">
                <span className="hidden sm:inline">대본 → 이미지 자동 생성</span>
                <span className="sm:hidden">이미지 생성</span>
              </h1>
              <span className="hidden md:inline text-sm text-slate-400 bg-slate-700 px-2 py-1 rounded whitespace-nowrap">
                Gemini 2.5 Flash Image
              </span>
            </div>
            {step !== 'input' && (
              <button
                onClick={reset}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-700 whitespace-nowrap"
              >
                새로 시작
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        {/* 단계 표시 */}
        <div className="mb-6 sm:mb-8">
          {/* 모바일: 현재 단계만 표시 */}
          <div className="sm:hidden flex items-center justify-center">
            <div className="flex items-center bg-slate-800 px-4 py-2 rounded-full">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-purple-600 text-white">
                {['input', 'settings', 'analyzing', 'generating', 'complete'].indexOf(step) + 1}
              </div>
              <span className="ml-2 text-sm text-white">
                {step === 'input' && '대본 입력'}
                {step === 'settings' && '설정'}
                {step === 'analyzing' && '분석 중'}
                {step === 'generating' && '생성 중'}
                {step === 'complete' && '완료'}
              </span>
              <span className="ml-2 text-xs text-slate-400">/ 5</span>
            </div>
          </div>
          {/* 태블릿 이상: 전체 단계 표시 */}
          <div className="hidden sm:flex items-center justify-center gap-2 md:gap-4">
            {['input', 'settings', 'analyzing', 'generating', 'complete'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-medium ${
                    step === s
                      ? 'bg-purple-600 text-white'
                      : ['input', 'settings', 'analyzing', 'generating', 'complete'].indexOf(step) > idx
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className={`ml-1 md:ml-2 text-xs md:text-sm ${step === s ? 'text-white' : 'text-slate-400'}`}>
                  {s === 'input' && '입력'}
                  {s === 'settings' && '설정'}
                  {s === 'analyzing' && '분석'}
                  {s === 'generating' && '생성'}
                  {s === 'complete' && '완료'}
                </span>
                {idx < 4 && <div className="w-4 md:w-8 h-px bg-slate-700 mx-1 md:mx-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Step 1: 대본 입력 */}
        {step === 'input' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4">1. 대본 입력</h2>

              {/* 파일 업로드 */}
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                >
                  📁 TXT 파일 불러오기
                </button>
              </div>

              {/* 텍스트 입력 */}
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="대본을 입력하세요 (최대 1만자)..."
                className="w-full h-80 p-4 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-slate-400">
                  {script.length.toLocaleString()} / 10,000자
                </span>
                <button
                  onClick={() => setStep('settings')}
                  disabled={!script.trim()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음 단계 →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 설정 */}
        {step === 'settings' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-6">2. 이미지 설정</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 화면 비율 */}
                <div>
                  <h3 className="text-white font-medium mb-3">화면 비율</h3>
                  <div className="space-y-2">
                    {Object.entries(ASPECT_RATIOS).map(([key, value]) => (
                      <label
                        key={key}
                        className={`flex items-center p-3 rounded-lg cursor-pointer border ${
                          aspectRatio === key
                            ? 'border-purple-500 bg-purple-900/30'
                            : 'border-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="aspectRatio"
                          value={key}
                          checked={aspectRatio === key}
                          onChange={(e) => setAspectRatio(e.target.value as keyof typeof ASPECT_RATIOS)}
                          className="hidden"
                        />
                        <div>
                          <div className="text-white font-medium">{value.label}</div>
                          <div className="text-sm text-slate-400">{value.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 화풍 */}
                <div>
                  <h3 className="text-white font-medium mb-3">화풍</h3>
                  <div className="space-y-2">
                    {Object.entries(STYLES).map(([key, value]) => (
                      <label
                        key={key}
                        className={`flex items-center p-3 rounded-lg cursor-pointer border ${
                          style === key
                            ? 'border-purple-500 bg-purple-900/30'
                            : 'border-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="style"
                          value={key}
                          checked={style === key}
                          onChange={(e) => setStyle(e.target.value as keyof typeof STYLES)}
                          className="hidden"
                        />
                        <div className="text-white font-medium">{value.name}</div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 최대 장면 수 */}
              <div className="mt-6">
                <h3 className="text-white font-medium mb-3">최대 장면 수</h3>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxScenes}
                  onChange={(e) => setMaxScenes(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-32 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="ml-3 text-sm text-slate-400">최대 100장</span>
              </div>

              {/* 예상 비용 */}
              <div className="mt-6 p-4 bg-slate-900 rounded-lg">
                <h3 className="text-white font-medium mb-2">예상 비용</h3>
                <div className="text-sm text-slate-400">
                  <p>이미지당: $0.039 (약 52원)</p>
                  <p>
                    {maxScenes}장 생성 시: 약 ${(maxScenes * 0.039).toFixed(2)} (약{' '}
                    {Math.round(maxScenes * 52).toLocaleString()}원)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep('input')}
                  className="px-6 py-3 text-slate-300 hover:text-white"
                >
                  ← 이전
                </button>
                <button
                  onClick={analyzeScript}
                  disabled={isAnalyzing}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {isAnalyzing ? '분석 중...' : '대본 분석 시작'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 분석 중 */}
        {step === 'analyzing' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-2">대본 분석 중...</h2>
              <p className="text-slate-400">장면 분할 및 캐릭터 추출을 진행하고 있습니다.</p>
            </div>
          </div>
        )}

        {/* Step 4: 생성 중 / 완료 */}
        {(step === 'generating' || step === 'complete') && (
          <div className="space-y-6">
            {/* 요약 */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">이미지 생성</h2>
                  <p className="text-sm text-slate-400">
                    총 {scenes.length}개 장면 | 캐릭터 {Object.keys(characters).length}명
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  {step === 'complete' && (
                    <div className="flex items-center gap-2 sm:gap-4 text-sm">
                      <span className="text-green-400">✅ {successCount}개 성공</span>
                      {failedCount > 0 && (
                        <span className="text-red-400">❌ {failedCount}개 실패</span>
                      )}
                    </div>
                  )}
                  {!isGenerating && step === 'generating' && (
                    <button
                      onClick={startGeneration}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm sm:text-base"
                    >
                      🎨 이미지 생성 시작
                    </button>
                  )}
                  {step === 'complete' && failedCount > 0 && (
                    <button
                      onClick={retryFailed}
                      disabled={isGenerating}
                      className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
                    >
                      재시도
                    </button>
                  )}
                  {step === 'complete' && successCount > 0 && (
                    <>
                      <button
                        onClick={downloadAll}
                        className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        다운로드
                      </button>
                      <button
                        onClick={saveToDatabase}
                        disabled={isSaving || saveResult?.success}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-sm ${
                          saveResult?.success
                            ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-50`}
                      >
                        {isSaving ? '저장 중...' : saveResult?.success ? '✓ 저장됨' : '💾 DB 저장'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 저장 결과 메시지 */}
              {saveResult && (
                <div
                  className={`mt-4 p-3 rounded-lg ${
                    saveResult.success
                      ? 'bg-green-900/50 border border-green-700 text-green-200'
                      : 'bg-red-900/50 border border-red-700 text-red-200'
                  }`}
                >
                  {saveResult.success ? (
                    <div>
                      <span className="font-medium">✅ {saveResult.message}</span>
                      <div className="text-sm mt-1 text-green-300">
                        프로젝트 ID: {saveResult.projectId} | 스크립트 ID: {saveResult.scriptId}
                      </div>
                    </div>
                  ) : (
                    <span>❌ {saveResult.message}</span>
                  )}
                </div>
              )}

              {/* 진행률 */}
              {isGenerating && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-slate-400 mb-1">
                    <span>진행 중: Scene {currentScene + 1} / {scenes.length}</span>
                    <span>{Math.round(((successCount + failedCount) / scenes.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all"
                      style={{ width: `${((successCount + failedCount) / scenes.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 캐릭터 정보 */}
            {Object.keys(characters).length > 0 && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-white font-bold mb-4">추출된 캐릭터</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(characters).map(([name, char]) => (
                    <div key={name} className="p-4 bg-slate-900 rounded-lg">
                      <div className="font-medium text-white">{name}</div>
                      <div className="text-sm text-slate-400 mt-1">
                        {char.age}세 {char.gender} | {char.role}
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        {char.hair} | {char.outfit?.top}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 이미지 그리드 */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-white font-bold mb-4">생성된 이미지</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.length > 0
                  ? results.map((result) => (
                      <div
                        key={result.scene_id}
                        className={`aspect-video bg-slate-900 rounded-lg overflow-hidden relative ${
                          result.status === 'generating' ? 'animate-pulse' : ''
                        }`}
                      >
                        {result.status === 'success' && result.imageBase64 && (
                          <img
                            src={`data:image/png;base64,${result.imageBase64}`}
                            alt={`Scene ${result.scene_id}`}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                            onClick={() => downloadImage(result)}
                          />
                        )}
                        {result.status === 'pending' && (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                            대기 중
                          </div>
                        )}
                        {result.status === 'generating' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
                          </div>
                        )}
                        {result.status === 'failed' && (
                          <div className="absolute inset-0 flex items-center justify-center text-red-400">
                            ❌ 실패
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                          Scene {result.scene_id}
                        </div>
                      </div>
                    ))
                  : scenes.map((scene) => (
                      <div
                        key={scene.scene_id}
                        className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative"
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm p-2 text-center">
                          {scene.description.slice(0, 50)}...
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                          Scene {scene.scene_id}
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        )}

        {/* 하단 정보 */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-slate-800/50 rounded-lg text-center text-xs sm:text-sm text-slate-400">
          <p className="hidden sm:block">📌 PRD 스펙: 한국인 캐릭터 (한복 금지) | 캐릭터 일관성 유지 | 실패 시 자동 재시도</p>
          <p className="sm:hidden">📌 한국인 캐릭터 | 캐릭터 일관성 | 자동 재시도</p>
          <p className="mt-1 hidden sm:block">
            API Rate Limit: RPM 500 | RPD 2,000 | 요청 간 0.2초 딜레이 적용
          </p>
          <p className="mt-1 sm:hidden">
            Rate Limit: RPM 500 | RPD 2,000
          </p>
        </div>
      </div>
    </div>
  );
}
