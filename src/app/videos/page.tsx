'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';

interface AttachedImage {
  id: string;
  base64: string;
  mimeType: string;
  name: string;
  preview: string;
}

interface GeneratedVideo {
  base64?: string;
  mimeType?: string;
  duration?: number;
  fileName?: string;
  filePath?: string;
  status?: string;
  operationName?: string;
  error?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachedImages?: AttachedImage[];
  videoPrompt?: string;
  generatedVideo?: GeneratedVideo | null;
  suggestedDuration?: number;
  timestamp: Date;
}

export default function VideosPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [format, setFormat] = useState<'long' | 'short'>('short');
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [pollingOperation, setPollingOperation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 초기 메시지 설정
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '안녕하세요! AI 영상 생성을 도와드리겠습니다.\n\nVeo 3.1 모델을 사용하여 5-8초 길이의 고품질 영상을 생성할 수 있습니다.\n\n사용 방법:\n1. 원하는 영상을 설명해주세요\n2. 시작 이미지가 있다면 첨부해주세요 (선택)\n3. AI가 프롬프트를 생성하면 "영상 생성하기" 버튼을 클릭하세요',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 비동기 영상 생성 상태 폴링
  useEffect(() => {
    if (!pollingOperation) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/video/chat?operationName=${encodeURIComponent(pollingOperation)}`);
        const result = await response.json();

        if (result.success) {
          if (result.data.status === 'SUCCEEDED' && result.data.video) {
            setGeneratedVideos(prev => [result.data.video, ...prev]);
            setPollingOperation(null);
            setIsGenerating(false);

            setMessages(prev => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: '영상 생성이 완료되었습니다!',
                generatedVideo: result.data.video,
                timestamp: new Date(),
              },
            ]);
          } else if (result.data.status === 'FAILED') {
            setPollingOperation(null);
            setIsGenerating(false);
            setMessages(prev => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: `영상 생성에 실패했습니다: ${result.data.error || '알 수 없는 오류'}`,
                timestamp: new Date(),
              },
            ]);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pollingOperation]);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: AttachedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const base64 = await fileToBase64(file);
      newImages.push({
        id: Date.now().toString() + i,
        base64: base64.split(',')[1],
        mimeType: file.type,
        name: file.name,
        preview: base64,
      });
    }

    setAttachedImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const removeAttachedImage = (id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  };

  const sendMessage = async (generateVideo = false) => {
    if (!input.trim() && !generateVideo && attachedImages.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: generateVideo ? '이 프롬프트로 영상을 생성해주세요' : input,
      attachedImages: attachedImages.length > 0 ? [...attachedImages] : undefined,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    const currentAttached = [...attachedImages];
    setAttachedImages([]);
    setIsLoading(true);

    if (generateVideo) {
      setIsGenerating(true);
    }

    try {
      const apiMessages = newMessages
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const apiAttachedImages = currentAttached.map(img => ({
        base64: img.base64,
        mimeType: img.mimeType,
      }));

      const response = await fetch('/api/video/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          format,
          attachedImages: apiAttachedImages,
          generateVideo,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.data.response,
          videoPrompt: result.data.videoPrompt,
          suggestedDuration: result.data.suggestedDuration,
          generatedVideo: result.data.video,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (result.data.videoPrompt) {
          setCurrentPrompt(result.data.videoPrompt);
        }

        if (result.data.video) {
          if (result.data.video.operationName && result.data.video.status === 'PENDING') {
            setPollingOperation(result.data.video.operationName);
          } else if (result.data.video.base64) {
            setGeneratedVideos(prev => [result.data.video, ...prev]);
            setIsGenerating(false);
          } else if (result.data.video.error) {
            setIsGenerating(false);
          }
        } else {
          setIsGenerating(false);
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `오류가 발생했습니다: ${result.error}`,
            timestamp: new Date(),
          },
        ]);
        setIsGenerating(false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `오류가 발생했습니다: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
      setIsGenerating(false);
    } finally {
      setIsLoading(false);
    }
  };

  const generateVideoFromPrompt = () => {
    sendMessage(true);
  };

  const downloadVideo = (video: GeneratedVideo, index: number) => {
    if (!video.base64) return;
    const link = document.createElement('a');
    link.href = `data:${video.mimeType || 'video/mp4'};base64,${video.base64}`;
    link.download = `generated_video_${index + 1}.mp4`;
    link.click();
  };

  const resetChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '새로운 영상을 만들어볼까요?\n\n원하시는 영상을 설명해주세요!',
        timestamp: new Date(),
      },
    ]);
    setCurrentPrompt(null);
    setAttachedImages([]);
    setPollingOperation(null);
    setIsGenerating(false);
  };

  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">AI 영상 생성</h1>
            <span className="text-sm text-white bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full">
              Veo 3.1
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={format}
              onChange={e => setFormat(e.target.value as 'long' | 'short')}
              className="border border-slate-600 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="long">가로 (16:9)</option>
              <option value="short">세로 (9:16)</option>
            </select>
            <button
              onClick={resetChat}
              className="px-4 py-2 text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-700"
            >
              새로 시작
            </button>
          </div>
        </div>
        <p className="text-slate-400 mt-1">채팅으로 영상을 설명하고, 이미지를 첨부하여 AI 영상을 생성합니다</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 채팅 영역 */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* 메시지 목록 */}
            <div className="h-[500px] overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {/* 첨부된 이미지들 */}
                    {message.attachedImages && message.attachedImages.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachedImages.map(img => (
                          <img
                            key={img.id}
                            src={img.preview}
                            alt={img.name}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-white/30"
                          />
                        ))}
                      </div>
                    )}

                    {/* 영상 프롬프트 */}
                    {message.videoPrompt && (
                      <div className="mt-3 p-3 bg-slate-600 rounded-lg">
                        <h4 className="font-bold text-sm mb-1 text-purple-300">
                          생성 프롬프트:
                        </h4>
                        <p className="text-xs text-slate-300">{message.videoPrompt}</p>
                        {message.suggestedDuration && (
                          <p className="text-xs text-purple-300 mt-1">
                            추천 길이: {message.suggestedDuration}초
                          </p>
                        )}
                      </div>
                    )}

                    {/* 생성된 영상 */}
                    {message.generatedVideo && message.generatedVideo.base64 && (
                      <div className="mt-3">
                        <video
                          src={`data:${message.generatedVideo.mimeType || 'video/mp4'};base64,${message.generatedVideo.base64}`}
                          controls
                          className="rounded-lg max-w-full"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => downloadVideo(message.generatedVideo!, 0)}
                            className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1"
                          >
                            다운로드
                          </button>
                          {message.generatedVideo.duration && (
                            <span className="text-xs text-slate-400">
                              {message.generatedVideo.duration}초
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 생성 중 상태 */}
                    {message.generatedVideo && message.generatedVideo.status === 'PENDING' && (
                      <div className="mt-3 p-3 bg-yellow-900/50 rounded-lg border border-yellow-700">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                          <span className="text-sm text-yellow-300">
                            영상 생성 중... (수 분 소요)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 오류 상태 */}
                    {message.generatedVideo && message.generatedVideo.error && (
                      <div className="mt-3 p-3 bg-red-900/50 rounded-lg border border-red-700">
                        <p className="text-sm text-red-300">
                          오류: {message.generatedVideo.error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                      <span className="text-slate-300">
                        {isGenerating ? '영상 생성 준비 중...' : '응답 생성 중...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 첨부 이미지 미리보기 */}
            {attachedImages.length > 0 && (
              <div className="border-t border-slate-700 px-4 py-2 bg-purple-900/30">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs text-purple-300 font-medium">시작 이미지:</span>
                  {attachedImages.map(img => (
                    <div key={img.id} className="relative">
                      <img
                        src={img.preview}
                        alt={img.name}
                        className="w-16 h-16 object-cover rounded-lg border-2 border-purple-500"
                      />
                      <button
                        onClick={() => removeAttachedImage(img.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 입력 영역 */}
            <div className="border-t border-slate-700 p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-3 border border-slate-600 rounded-xl hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                  title="시작 이미지 첨부"
                >
                  이미지
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="원하는 영상을 설명해주세요..."
                  className="flex-1 border border-slate-600 bg-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-400"
                  disabled={isLoading || isGenerating}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || isGenerating || (!input.trim() && attachedImages.length === 0)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  전송
                </button>
              </div>

              {/* 생성 버튼 */}
              {currentPrompt && !isGenerating && (
                <div className="mt-3">
                  <button
                    onClick={generateVideoFromPrompt}
                    disabled={isLoading || isGenerating}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                  >
                    영상 생성하기 (Veo 3.1)
                  </button>
                  <p className="text-xs text-slate-400 text-center mt-1">
                    5-8초 길이의 영상이 생성됩니다 (생성에 수 분 소요)
                  </p>
                </div>
              )}

              {/* 생성 중 상태 */}
              {isGenerating && (
                <div className="mt-3 p-4 bg-purple-900/30 rounded-lg border border-purple-700">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin h-6 w-6 border-3 border-purple-500 border-t-transparent rounded-full"></div>
                    <div>
                      <p className="font-medium text-purple-300">영상 생성 중...</p>
                      <p className="text-sm text-purple-400">
                        Veo 3.1 모델이 영상을 생성하고 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 생성된 영상 갤러리 */}
          {generatedVideos.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <h3 className="font-bold text-lg mb-3 text-white">생성된 영상</h3>
              <div className="space-y-3">
                {generatedVideos.slice(0, 4).map((video, idx) => (
                  <div key={idx} className="relative group">
                    {video.base64 ? (
                      <>
                        <video
                          src={`data:${video.mimeType || 'video/mp4'};base64,${video.base64}`}
                          className="w-full rounded-lg"
                          controls
                        />
                        <button
                          onClick={() => downloadVideo(video, idx)}
                          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          다운로드
                        </button>
                      </>
                    ) : (
                      <div className="w-full aspect-video bg-slate-700 rounded-lg flex items-center justify-center">
                        <span className="text-slate-400">로딩 중...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 현재 프롬프트 */}
          {currentPrompt && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <h3 className="font-bold text-lg mb-2 text-white">현재 프롬프트</h3>
              <p className="text-sm text-slate-300 break-words">{currentPrompt}</p>
            </div>
          )}

          {/* 팁 */}
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-4 border border-purple-700">
            <h3 className="font-bold text-purple-200 mb-2">영상 생성 팁</h3>
            <ul className="text-sm text-purple-300 space-y-1">
              <li>- 카메라 움직임을 명시하세요 (pan, zoom, dolly)</li>
              <li>- 시작 이미지를 첨부하면 더 정확해요</li>
              <li>- 조명과 분위기를 설명해주세요</li>
              <li>- 5-8초 짧은 클립이 생성됩니다</li>
            </ul>
          </div>

          {/* 빠른 시작 */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="font-bold text-lg mb-3 text-white">빠른 시작</h3>
            <div className="space-y-2">
              {[
                '카메라가 천천히 줌인하는 인물 샷',
                '해변에서 파도가 밀려오는 장면',
                '테이블 위 음식에서 김이 피어오르는 클로즈업',
                '도시 야경을 비추는 드론 샷',
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(prompt)}
                  className="w-full text-left px-3 py-2 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-purple-900/50 hover:text-purple-200 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* 모델 정보 */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="font-bold text-slate-200 mb-2">사용 모델</h3>
            <div className="text-sm text-slate-400 space-y-1">
              <p>
                <span className="text-slate-300">채팅:</span> gemini-3-pro-preview
              </p>
              <p>
                <span className="text-slate-300">영상:</span> veo-3.1-generate-preview
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Google Veo 3.1은 최신 영상 생성 AI 모델입니다.
              </p>
            </div>
          </div>

          {/* 제한 사항 */}
          <div className="bg-yellow-900/30 rounded-xl p-4 border border-yellow-700">
            <h3 className="font-bold text-yellow-300 mb-2">제한 사항</h3>
            <ul className="text-sm text-yellow-400 space-y-1">
              <li>- 영상 길이: 5-8초</li>
              <li>- 생성 시간: 1-5분</li>
              <li>- 복잡한 장면은 더 오래 걸릴 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
