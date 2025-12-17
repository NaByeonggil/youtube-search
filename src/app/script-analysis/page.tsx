'use client';

import React, { useState, useRef, useEffect } from 'react';

// 모바일 탭 타입
type MobileTab = 'input' | 'analysis' | 'chat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AnalysisResult {
  structure: {
    sections: Array<{
      name: string;
      startChar: number;
      endChar: number;
      content: string;
      purpose: string;
    }>;
  };
  characterCount: {
    total: number;
    bySection: Array<{
      section: string;
      count: number;
      percentage: number;
    }>;
    estimatedDuration: string;
    recommendation: string;
  };
  storytelling: {
    techniques: Array<{
      name: string;
      detected: boolean;
      examples: string[];
      effectiveness: string;
      suggestion?: string;
    }>;
  };
  hooks: {
    found: Array<{
      type: string;
      text: string;
      position: string;
      strength: string;
      technique: string;
    }>;
    missing: string[];
  };
  improvements: Array<{
    category: string;
    current?: string;
    improved?: string;
    issue?: string;
    solution?: string;
    reason: string;
  }>;
  planningNotes: {
    targetAudience: string;
    contentTone: string;
    visualRecommendations: string[];
    editingNotes: string[];
    thumbnailIdeas: string[];
  };
}

export default function ScriptAnalysisPage() {
  const [script, setScript] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // YouTube 관련 상태
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<'manual' | 'youtube-caption' | 'whisper' | null>(null);
  const [showWhisperConfirm, setShowWhisperConfirm] = useState(false);
  const [videoInfo, setVideoInfo] = useState<{ videoId: string; duration?: string } | null>(null);

  // 모바일 탭 상태
  const [mobileTab, setMobileTab] = useState<MobileTab>('input');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 글자 수 계산
  const charCount = script.length;
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;

  // YouTube URL 유효성 검사
  const isValidYoutubeUrl = (url: string): boolean => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    return patterns.some((pattern) => pattern.test(url));
  };

  // YouTube 자막 추출
  const handleYoutubeExtract = async () => {
    if (!youtubeUrl.trim() || !isValidYoutubeUrl(youtubeUrl)) {
      alert('유효한 YouTube URL을 입력해주세요.');
      return;
    }

    setIsLoadingTranscript(true);
    setShowWhisperConfirm(false);

    try {
      // 1단계: 자막 추출 시도
      const response = await fetch('/api/youtube/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, language: 'ko' }),
      });

      const data = await response.json();

      if (data.success) {
        // 자막 추출 성공
        setScript(data.data.transcript);
        setTranscriptSource('youtube-caption');
        setVideoInfo({
          videoId: data.data.videoId,
          duration: data.data.estimatedDuration,
        });

        const successMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `YouTube 자막을 성공적으로 추출했습니다.\n- 언어: ${data.data.language}\n- 글자 수: ${data.data.characterCount.toLocaleString()}자\n- 영상 길이: ${data.data.estimatedDuration}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else if (data.needsWhisper) {
        // 자막이 없어서 Whisper 필요
        setShowWhisperConfirm(true);
        setVideoInfo({ videoId: data.videoId });

        const warningMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `${data.message || '이 영상에는 자막이 없습니다.'}\n\nWhisper 음성 인식을 사용하시겠습니까? (시간이 다소 소요될 수 있습니다)`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, warningMessage]);
      } else {
        throw new Error(data.error || '자막 추출에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('YouTube 추출 오류:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `YouTube 자막 추출 중 오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // Whisper로 음성 인식
  const handleWhisperTranscribe = async () => {
    setIsLoadingTranscript(true);
    setShowWhisperConfirm(false);

    const processingMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '🎤 Whisper 음성 인식 중입니다... (1-2분 소요될 수 있습니다)',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, processingMessage]);

    try {
      const response = await fetch('/api/youtube/whisper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, language: 'ko' }),
      });

      const data = await response.json();

      if (data.success) {
        setScript(data.data.transcript);
        setTranscriptSource('whisper');
        setVideoInfo({
          videoId: data.data.videoId,
        });

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Whisper 음성 인식이 완료되었습니다.\n- 글자 수: ${data.data.characterCount.toLocaleString()}자\n\n이제 [구조 분석] 버튼을 클릭하여 대본을 분석할 수 있습니다.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        throw new Error(data.error || '음성 인식에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Whisper 오류:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Whisper 음성 인식 중 오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // 구조 분석 실행
  const handleAnalyze = async () => {
    if (!script.trim()) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    setSavedId(null); // 새 분석 시 저장 상태 초기화

    try {
      const response = await fetch('/api/script/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, analysisDepth: 'detailed' }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
        const systemMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '대본 구조 분석이 완료되었습니다. 추가 질문이 있으시면 말씀해주세요.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);
      } else {
        throw new Error(data.error || '분석에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('분석 오류:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `분석 중 오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI 채팅 전송
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatting(true);

    try {
      const response = await fetch('/api/script/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          previousAnalysis: analysis,
          userMessage: chatInput.trim(),
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (data.updatedAnalysis) {
          setAnalysis(data.updatedAnalysis);
        }
      } else {
        throw new Error(data.error || '응답 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('채팅 오류:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatting(false);
    }
  };

  // 결과 복사
  const handleCopy = () => {
    if (!analysis) return;
    const text = formatAnalysisAsText(analysis);
    navigator.clipboard.writeText(text);
    alert('분석 결과가 클립보드에 복사되었습니다.');
  };

  // 텍스트 파일 저장
  const handleSaveAsFile = () => {
    if (!analysis) return;
    const text = formatAnalysisAsText(analysis);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `대본분석_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // DB 저장 상태
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  // DB에 분석 결과 저장
  const handleSaveToDb = async () => {
    if (!analysis || !script.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/script/structure-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: script.substring(0, 100).trim() + (script.length > 100 ? '...' : ''),
          originalScript: script,
          scriptSource: transcriptSource || 'manual',
          youtubeVideoId: videoInfo?.videoId,
          analysis,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSavedId(data.data.id);
        const successMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ 분석 결과가 DB에 저장되었습니다. (ID: ${data.data.id})\n\n[분석 기록 보기](/script-analysis/history)에서 저장된 분석을 확인할 수 있습니다.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        throw new Error(data.error || '저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('DB 저장 오류:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ DB 저장 중 오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSaving(false);
    }
  };

  // 분석 결과를 텍스트로 포맷
  const formatAnalysisAsText = (result: AnalysisResult): string => {
    let text = `=====================================
        대본 구조 분석 결과
=====================================
분석일시: ${new Date().toLocaleString('ko-KR')}
${videoInfo ? `YouTube Video ID: ${videoInfo.videoId}` : ''}
${transcriptSource ? `대본 소스: ${transcriptSource === 'youtube-caption' ? 'YouTube 자막' : transcriptSource === 'whisper' ? 'Whisper 음성 인식' : '직접 입력'}` : ''}

[1. 대본 구성]
`;

    result.structure.sections.forEach((section) => {
      text += `- ${section.name}: ${section.startChar}~${section.endChar}자 (${section.purpose})\n`;
    });

    text += `
[2. 글자 수 분석]
- 전체: ${result.characterCount.total}자
- 예상 길이: ${result.characterCount.estimatedDuration}
`;

    result.characterCount.bySection.forEach((s) => {
      text += `- ${s.section}: ${s.count}자 (${s.percentage.toFixed(1)}%)\n`;
    });

    text += `\n권장사항: ${result.characterCount.recommendation}\n`;

    text += `
[3. 스토리텔링 기법]
`;
    result.storytelling.techniques.forEach((t) => {
      text += `- ${t.name}: ${t.detected ? '감지됨' : '미감지'} (${t.effectiveness})\n`;
      if (t.examples.length > 0) {
        text += `  예시: ${t.examples.join(', ')}\n`;
      }
      if (t.suggestion) {
        text += `  제안: ${t.suggestion}\n`;
      }
    });

    text += `
[4. 후킹 포인트]
`;
    result.hooks.found.forEach((h) => {
      text += `- ${h.type} (${h.position}): "${h.text}" - ${h.strength} (${h.technique})\n`;
    });

    if (result.hooks.missing.length > 0) {
      text += `\n누락된 훅:\n`;
      result.hooks.missing.forEach((m) => {
        text += `- ${m}\n`;
      });
    }

    text += `
[5. 개선 제안]
`;
    result.improvements.forEach((imp, i) => {
      text += `${i + 1}. ${imp.category}\n`;
      if (imp.current) text += `   현재: ${imp.current}\n`;
      if (imp.improved) text += `   개선: ${imp.improved}\n`;
      if (imp.issue) text += `   문제: ${imp.issue}\n`;
      if (imp.solution) text += `   해결: ${imp.solution}\n`;
      text += `   이유: ${imp.reason}\n\n`;
    });

    text += `
[6. 기획 참고사항]
- 타겟 오디언스: ${result.planningNotes.targetAudience}
- 콘텐츠 톤: ${result.planningNotes.contentTone}

비주얼 추천:
${result.planningNotes.visualRecommendations.map((v) => `- ${v}`).join('\n')}

편집 노트:
${result.planningNotes.editingNotes.map((e) => `- ${e}`).join('\n')}

썸네일 아이디어:
${result.planningNotes.thumbnailIdeas.map((t) => `- ${t}`).join('\n')}

=====================================
`;

    return text;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* 헤더 */}
      <header className="border-b border-[#2a2a2a] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <h1 className="text-base md:text-xl font-semibold">대본 구조 분석</h1>
        <div className="flex items-center gap-2 md:gap-4">
          {transcriptSource && (
            <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded">
              {transcriptSource === 'youtube-caption' ? '📺 YouTube' :
               transcriptSource === 'whisper' ? '🎤 Whisper' : '✏️ 직접'}
            </span>
          )}
          <span className="hidden sm:block text-[#888888] text-sm">Gemini AI 기반 분석</span>
        </div>
      </header>

      {/* 모바일 탭 네비게이션 */}
      <div className="lg:hidden border-b border-[#2a2a2a] flex">
        <button
          onClick={() => setMobileTab('input')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'input'
              ? 'text-white border-b-2 border-white bg-[#1a1a1a]'
              : 'text-[#888888] hover:text-white'
          }`}
        >
          📝 대본 입력
        </button>
        <button
          onClick={() => setMobileTab('analysis')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'analysis'
              ? 'text-white border-b-2 border-white bg-[#1a1a1a]'
              : 'text-[#888888] hover:text-white'
          }`}
        >
          📊 분석 결과
          {analysis && <span className="ml-1 text-xs text-green-400">●</span>}
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'chat'
              ? 'text-white border-b-2 border-white bg-[#1a1a1a]'
              : 'text-[#888888] hover:text-white'
          }`}
        >
          💬 AI 채팅
          {messages.length > 0 && <span className="ml-1 text-xs bg-[#333] px-1.5 rounded-full">{messages.length}</span>}
        </button>
      </div>

      {/* 메인 컨텐츠 - 반응형 레이아웃 */}
      <main className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* 좌측: 대본 입력 - 모바일에서는 탭으로 표시 */}
        <section className={`
          ${mobileTab === 'input' ? 'flex' : 'hidden'} lg:flex
          w-full lg:w-[20%] border-b lg:border-b-0 lg:border-r border-[#2a2a2a] flex-col
          flex-1 lg:flex-none
        `}>
          <div className="hidden lg:block p-4 border-b border-[#2a2a2a]">
            <h2 className="text-sm font-medium text-[#888888]">대본 입력</h2>
          </div>

          {/* YouTube URL 입력 */}
          <div className="p-4 border-b border-[#2a2a2a] space-y-2">
            <label className="text-xs text-[#888888]">YouTube 링크로 불러오기</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="YouTube URL 입력..."
                className="flex-1 px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555555] text-xs focus:outline-none focus:border-[#444444]"
                disabled={isLoadingTranscript}
              />
              <button
                onClick={handleYoutubeExtract}
                disabled={!youtubeUrl.trim() || isLoadingTranscript}
                className="px-3 py-2 bg-[#ff0000] text-white rounded-lg text-xs font-medium hover:bg-[#cc0000] disabled:bg-[#333333] disabled:text-[#666666] disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingTranscript ? '...' : '추출'}
              </button>
            </div>
            {isLoadingTranscript && (
              <div className="flex items-center gap-2 text-xs text-[#888888]">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                <span>자막 추출 중...</span>
              </div>
            )}
          </div>

          {/* Whisper 확인 모달 */}
          {showWhisperConfirm && (
            <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
              <p className="text-xs text-[#888888] mb-3">자막이 없습니다. Whisper 음성 인식을 사용하시겠습니까?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleWhisperTranscribe}
                  className="flex-1 px-3 py-2 bg-white text-black rounded-lg text-xs font-medium hover:bg-[#e0e0e0]"
                >
                  Whisper 사용
                </button>
                <button
                  onClick={() => setShowWhisperConfirm(false)}
                  className="flex-1 px-3 py-2 border border-[#2a2a2a] text-white rounded-lg text-xs hover:bg-[#2a2a2a]"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 대본 텍스트 입력 */}
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <textarea
              value={script}
              onChange={(e) => {
                setScript(e.target.value);
                if (!transcriptSource) setTranscriptSource('manual');
              }}
              placeholder="분석할 대본을 붙여넣거나 YouTube URL을 입력하세요..."
              className="flex-1 w-full bg-[#141414] border border-[#2a2a2a] rounded-lg p-4 text-white placeholder-[#555555] resize-none focus:outline-none focus:border-[#444444] text-sm leading-relaxed min-h-[200px] lg:min-h-0"
            />
            <div className="mt-3 text-[#888888] text-xs flex justify-between">
              <span>{charCount.toLocaleString()}자</span>
              <span>{wordCount.toLocaleString()}단어</span>
            </div>
          </div>

          {/* 모바일용 분석 버튼 */}
          <div className="lg:hidden p-4 border-t border-[#2a2a2a]">
            <button
              onClick={() => {
                handleAnalyze();
                setMobileTab('analysis');
              }}
              disabled={!script.trim() || isAnalyzing}
              className="w-full py-3 px-4 bg-white text-black rounded-lg font-medium text-sm hover:bg-[#e0e0e0] disabled:bg-[#333333] disabled:text-[#666666] disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? '분석 중...' : '🔍 구조 분석 시작'}
            </button>
          </div>
        </section>

        {/* 중앙: 분석 결과 - 모바일에서는 탭으로 표시 */}
        <section className={`
          ${mobileTab === 'analysis' ? 'flex' : 'hidden'} lg:flex
          w-full lg:w-[50%] border-b lg:border-b-0 lg:border-r border-[#2a2a2a] flex-col
          flex-1 lg:flex-none
        `}>
          {/* 데스크탑용 헤더 */}
          <div className="hidden lg:flex p-4 border-b border-[#2a2a2a] items-center justify-between">
            <h2 className="text-sm font-medium text-[#888888]">분석 결과</h2>
            {videoInfo && (
              <a
                href={`https://youtube.com/watch?v=${videoInfo.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#ff0000] hover:underline"
              >
                원본 영상 보기 →
              </a>
            )}
          </div>
          {/* 모바일용 영상 링크 */}
          {videoInfo && (
            <div className="lg:hidden p-3 border-b border-[#2a2a2a] flex justify-center">
              <a
                href={`https://youtube.com/watch?v=${videoInfo.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#ff0000] hover:underline"
              >
                📺 원본 영상 보기 →
              </a>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4">
            {isAnalyzing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-[#888888]">Gemini AI가 분석 중입니다...</p>
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                {/* 1. 대본 구성 */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2a2a2a]">
                  <h3 className="text-base font-semibold mb-3 text-white">1. 대본 구성 분석</h3>
                  <div className="space-y-2">
                    {analysis.structure.sections.map((section, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-white">{section.name}</span>
                        <span className="text-[#888888]">
                          {section.startChar}~{section.endChar}자
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. 글자 수 분석 */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2a2a2a]">
                  <h3 className="text-base font-semibold mb-3 text-white">2. 섹션별 글자 수</h3>
                  <div className="mb-3 text-sm text-[#888888]">
                    전체: {analysis.characterCount.total.toLocaleString()}자 | 예상 길이: {analysis.characterCount.estimatedDuration}
                  </div>
                  <div className="space-y-2">
                    {analysis.characterCount.bySection.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm text-white w-20">{s.section}</span>
                        <div className="flex-1 bg-[#2a2a2a] rounded-full h-2">
                          <div
                            className="bg-white rounded-full h-2"
                            style={{ width: `${s.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#888888] w-16 text-right">
                          {s.count}자 ({s.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[#888888]">{analysis.characterCount.recommendation}</p>
                </div>

                {/* 3. 스토리텔링 기법 */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2a2a2a]">
                  <h3 className="text-base font-semibold mb-3 text-white">3. 스토리텔링 기법</h3>
                  <div className="space-y-3">
                    {analysis.storytelling.techniques.map((t, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={t.detected ? 'text-white' : 'text-[#555555]'}>
                            {t.detected ? '●' : '○'} {t.name}
                          </span>
                          <span className="text-xs text-[#888888]">({t.effectiveness})</span>
                        </div>
                        {t.examples.length > 0 && (
                          <p className="text-xs text-[#888888] ml-4">
                            예시: {t.examples.join(', ')}
                          </p>
                        )}
                        {t.suggestion && (
                          <p className="text-xs text-[#666666] ml-4 mt-1">
                            → {t.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. 후킹 포인트 */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2a2a2a]">
                  <h3 className="text-base font-semibold mb-3 text-white">4. 후킹 포인트</h3>
                  <div className="space-y-3">
                    {analysis.hooks.found.map((h, i) => (
                      <div key={i} className="text-sm border-l-2 border-white pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{h.type}</span>
                          <span className="text-xs text-[#888888]">({h.position})</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            h.strength === '강함' ? 'bg-white text-black' :
                            h.strength === '중간' ? 'bg-[#444444] text-white' :
                            'bg-[#2a2a2a] text-[#888888]'
                          }`}>
                            {h.strength}
                          </span>
                        </div>
                        <p className="text-[#888888] text-xs">"{h.text}"</p>
                        <p className="text-[#666666] text-xs mt-1">기법: {h.technique}</p>
                      </div>
                    ))}
                  </div>
                  {analysis.hooks.missing.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
                      <p className="text-xs text-[#888888] mb-2">누락된 훅 포인트:</p>
                      {analysis.hooks.missing.map((m, i) => (
                        <p key={i} className="text-xs text-[#666666]">• {m}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. 개선 제안 */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2a2a2a]">
                  <h3 className="text-base font-semibold mb-3 text-white">5. 개선 제안</h3>
                  <div className="space-y-4">
                    {analysis.improvements.map((imp, i) => (
                      <div key={i} className="text-sm">
                        <p className="text-white font-medium mb-2">{imp.category}</p>
                        {imp.current && (
                          <div className="bg-[#1a1a1a] rounded p-2 mb-2">
                            <span className="text-xs text-[#888888]">현재: </span>
                            <span className="text-xs text-[#666666]">{imp.current}</span>
                          </div>
                        )}
                        {imp.improved && (
                          <div className="bg-[#1a1a1a] rounded p-2 mb-2 border-l-2 border-white">
                            <span className="text-xs text-[#888888]">개선: </span>
                            <span className="text-xs text-white">{imp.improved}</span>
                          </div>
                        )}
                        {imp.issue && (
                          <p className="text-xs text-[#888888]">문제: {imp.issue}</p>
                        )}
                        {imp.solution && (
                          <p className="text-xs text-white">해결: {imp.solution}</p>
                        )}
                        <p className="text-xs text-[#666666] mt-1">→ {imp.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. 기획 참고사항 */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2a2a2a]">
                  <h3 className="text-base font-semibold mb-3 text-white">6. 영상 기획 참고사항</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-[#888888]">타겟 오디언스: </span>
                      <span className="text-white">{analysis.planningNotes.targetAudience}</span>
                    </div>
                    <div>
                      <span className="text-[#888888]">콘텐츠 톤: </span>
                      <span className="text-white">{analysis.planningNotes.contentTone}</span>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">비주얼 추천:</p>
                      {analysis.planningNotes.visualRecommendations.map((v, i) => (
                        <p key={i} className="text-xs text-white ml-2">• {v}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">편집 노트:</p>
                      {analysis.planningNotes.editingNotes.map((e, i) => (
                        <p key={i} className="text-xs text-white ml-2">• {e}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">썸네일 아이디어:</p>
                      {analysis.planningNotes.thumbnailIdeas.map((t, i) => (
                        <p key={i} className="text-xs text-white ml-2">• {t}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-[#555555] mb-2">대본을 입력하거나</p>
                  <p className="text-[#555555] mb-2">YouTube URL을 입력한 후</p>
                  <p className="text-[#555555]">[구조 분석] 버튼을 클릭하세요</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 우측: AI 채팅 & 버튼 - 모바일에서는 탭으로 표시 */}
        <section className={`
          ${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex
          w-full lg:w-[30%] flex-col
          flex-1 lg:flex-none
        `}>
          <div className="hidden lg:block p-4 border-b border-[#2a2a2a]">
            <h2 className="text-sm font-medium text-[#888888]">AI 채팅</h2>
          </div>

          {/* 채팅 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-[#555555] text-sm py-8">
                <p>YouTube URL 입력 또는</p>
                <p>대본을 직접 입력한 후</p>
                <p>분석을 시작하세요</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg p-3 text-sm ${
                      message.role === 'user'
                        ? 'bg-white text-black'
                        : 'bg-[#1a1a1a] text-white border border-[#2a2a2a]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                  <div className="flex items-center gap-2 text-sm text-[#888888]">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                    <span>응답 생성 중...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 액션 버튼 */}
          <div className="p-4 border-t border-[#2a2a2a] space-y-2">
            <button
              onClick={handleAnalyze}
              disabled={!script.trim() || isAnalyzing}
              className="w-full py-2.5 px-4 bg-white text-black rounded-lg font-medium text-sm hover:bg-[#e0e0e0] disabled:bg-[#333333] disabled:text-[#666666] disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? '분석 중...' : '구조 분석'}
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={!analysis}
                className="flex-1 py-2 px-4 border border-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#1a1a1a] disabled:text-[#555555] disabled:cursor-not-allowed transition-colors"
              >
                복사
              </button>
              <button
                onClick={handleSaveAsFile}
                disabled={!analysis}
                className="flex-1 py-2 px-4 border border-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#1a1a1a] disabled:text-[#555555] disabled:cursor-not-allowed transition-colors"
              >
                파일 저장
              </button>
            </div>
            {/* DB 저장 버튼 */}
            <button
              onClick={handleSaveToDb}
              disabled={!analysis || isSaving || savedId !== null}
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
                savedId !== null
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-[#333333] disabled:text-[#666666] disabled:cursor-not-allowed'
              }`}
            >
              {isSaving ? '저장 중...' : savedId !== null ? `✓ 저장됨 (ID: ${savedId})` : '💾 DB에 저장'}
            </button>
            {/* 분석 기록 보기 링크 */}
            <a
              href="/script-analysis/history"
              className="block w-full py-2 px-4 border border-[#2a2a2a] text-center text-white rounded-lg text-sm hover:bg-[#1a1a1a] transition-colors"
            >
              📋 분석 기록 보기
            </a>
          </div>

          {/* 채팅 입력 */}
          <div className="p-4 border-t border-[#2a2a2a]">
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="추가 질문 입력..."
                disabled={!analysis || isChatting}
                className="flex-1 px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555555] text-sm focus:outline-none focus:border-[#444444] disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || !analysis || isChatting}
                className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] disabled:bg-[#333333] disabled:text-[#666666] disabled:cursor-not-allowed transition-colors"
              >
                전송
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
