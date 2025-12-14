'use client';

import { useState, useRef, useEffect } from 'react';

// 화면 비율 옵션
const ASPECT_RATIOS = {
  '16:9': { label: '가로형 (16:9)', description: 'YouTube, 영상용' },
  '1:1': { label: '정사각형 (1:1)', description: 'Instagram, 썸네일' },
  '9:16': { label: '세로형 (9:16)', description: 'TikTok, Reels, Shorts' },
};

// 화풍 옵션
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

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'image';
  content: string;
  imageBase64?: string;
  timestamp: Date;
  saved?: boolean;
  saving?: boolean;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  imageBase64: string;
  timestamp: Date;
  saved: boolean;
  saving: boolean;
  aspectRatio: string;
  style: string;
}

export default function ChatImageGenerationPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<keyof typeof ASPECT_RATIOS>('16:9');
  const [style, setStyle] = useState<keyof typeof STYLES>('photorealistic');
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 스크롤을 맨 아래로
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 날짜 포맷 (파일명용)
  const formatDateForFilename = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}`;
  };

  // 파일명 생성 (생성날짜-채팅명.png)
  const generateFilename = (prompt: string, date: Date) => {
    const dateStr = formatDateForFilename(date);
    // 채팅명에서 파일명에 사용할 수 없는 문자 제거 및 길이 제한
    const sanitizedPrompt = prompt
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 50);
    return `${dateStr}-${sanitizedPrompt}.png`;
  };

  // 이미지 생성
  const generateImage = async (prompt: string) => {
    if (!prompt.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);

    // 생성 중 메시지
    const generatingMessage: ChatMessage = {
      id: `gen-${Date.now()}`,
      type: 'assistant',
      content: '이미지를 생성하고 있습니다...',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, generatingMessage]);

    try {
      const response = await fetch('/api/images/chat-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          style: STYLES[style],
        }),
      });

      const result = await response.json();

      // 생성 중 메시지 제거
      setMessages(prev => prev.filter(m => m.id !== generatingMessage.id));

      if (result.success) {
        const imageId = `img-${Date.now()}`;
        const timestamp = new Date();

        // 이미지 메시지 추가
        const imageMessage: ChatMessage = {
          id: imageId,
          type: 'image',
          content: prompt,
          imageBase64: result.data.image,
          timestamp,
          saved: false,
        };
        setMessages(prev => [...prev, imageMessage]);

        // 생성된 이미지 목록에 추가
        const newImage: GeneratedImage = {
          id: imageId,
          prompt,
          imageBase64: result.data.image,
          timestamp,
          saved: false,
          saving: false,
          aspectRatio,
          style: STYLES[style].name,
        };
        setGeneratedImages(prev => [newImage, ...prev]);

      } else {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          type: 'assistant',
          content: `이미지 생성 실패: ${result.error || '알 수 없는 오류'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m.id !== generatingMessage.id));

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `오류 발생: ${error.message || '네트워크 오류'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  // 이미지 DB 저장
  const saveImageToDatabase = async (imageId: string) => {
    const image = generatedImages.find(img => img.id === imageId);
    if (!image || image.saved || image.saving) return;

    // 저장 중 상태로 변경
    setGeneratedImages(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, saving: true } : img
      )
    );
    setMessages(prev =>
      prev.map(msg =>
        msg.id === imageId ? { ...msg, saving: true } : msg
      )
    );

    try {
      const filename = generateFilename(image.prompt, image.timestamp);

      const response = await fetch('/api/images/chat-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: image.prompt,
          imageBase64: image.imageBase64,
          filename,
          aspectRatio: image.aspectRatio,
          style: image.style,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 저장 완료 상태로 변경
        setGeneratedImages(prev =>
          prev.map(img =>
            img.id === imageId ? { ...img, saved: true, saving: false } : img
          )
        );
        setMessages(prev =>
          prev.map(msg =>
            msg.id === imageId ? { ...msg, saved: true, saving: false } : msg
          )
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      // 저장 실패
      setGeneratedImages(prev =>
        prev.map(img =>
          img.id === imageId ? { ...img, saving: false } : img
        )
      );
      setMessages(prev =>
        prev.map(msg =>
          msg.id === imageId ? { ...msg, saving: false } : msg
        )
      );
      alert(`저장 실패: ${error.message}`);
    }
  };

  // 이미지 다운로드
  const downloadImage = (imageBase64: string, prompt: string, timestamp: Date) => {
    const filename = generateFilename(prompt, timestamp);
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = filename;
    link.click();
  };

  // 전체 저장
  const saveAllImages = async () => {
    const unsavedImages = generatedImages.filter(img => !img.saved && !img.saving);
    for (const image of unsavedImages) {
      await saveImageToDatabase(image.id);
    }
  };

  // 전체 다운로드
  const downloadAllImages = () => {
    generatedImages.forEach((image, index) => {
      setTimeout(() => {
        downloadImage(image.imageBase64, image.prompt, image.timestamp);
      }, index * 200);
    });
  };

  // Enter 키로 전송
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateImage(inputMessage);
    }
  };

  const unsavedCount = generatedImages.filter(img => !img.saved).length;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-white">
                채팅으로 이미지 생성
              </h1>
              <span className="text-sm text-slate-400 bg-slate-700 px-2 py-1 rounded">
                Gemini 2.0 Flash
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  showSettings ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 화면 비율 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    화면 비율
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ASPECT_RATIOS).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setAspectRatio(key as keyof typeof ASPECT_RATIOS)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          aspectRatio === key
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {value.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 화풍 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    화풍
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(STYLES).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setStyle(key as keyof typeof STYLES)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          style === key
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {value.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col lg:border-r lg:border-slate-700">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <div className="text-6xl mb-4">🎨</div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    채팅으로 이미지를 생성하세요
                  </h2>
                  <p className="text-sm">
                    원하는 이미지를 설명하면 AI가 생성해드립니다
                  </p>
                  <div className="mt-4 text-xs text-slate-500">
                    예시: "해변에서 석양을 바라보는 한국인 여성"
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-purple-600 text-white px-4 py-2'
                        : message.type === 'image'
                        ? 'bg-slate-800 p-3 border border-slate-700'
                        : 'bg-slate-700 text-slate-200 px-4 py-2'
                    }`}
                  >
                    {message.type === 'image' && message.imageBase64 ? (
                      <div>
                        <img
                          src={`data:image/png;base64,${message.imageBase64}`}
                          alt={message.content}
                          className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => downloadImage(message.imageBase64!, message.content, message.timestamp)}
                        />
                        <p className="mt-2 text-sm text-slate-400 truncate">
                          {message.content}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => downloadImage(message.imageBase64!, message.content, message.timestamp)}
                            className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                          >
                            다운로드
                          </button>
                          <button
                            onClick={() => saveImageToDatabase(message.id)}
                            disabled={message.saved || message.saving}
                            className={`px-3 py-1 text-xs rounded-lg ${
                              message.saved
                                ? 'bg-green-700 text-green-200 cursor-default'
                                : message.saving
                                ? 'bg-slate-600 text-slate-400 cursor-wait'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {message.saved ? '✓ 저장됨' : message.saving ? '저장 중...' : 'DB 저장'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-700 bg-slate-800">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="생성하고 싶은 이미지를 설명하세요..."
                disabled={isGenerating}
                rows={2}
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-50"
              />
              <button
                onClick={() => generateImage(inputMessage)}
                disabled={!inputMessage.trim() || isGenerating}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Enter로 전송 | Shift+Enter로 줄바꿈
            </p>
          </div>
        </div>

        {/* Generated Images Gallery (Card View) */}
        <div className="lg:w-96 bg-slate-800/50 border-t lg:border-t-0 border-slate-700">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">
                생성된 이미지 ({generatedImages.length})
              </h2>
              {generatedImages.length > 0 && (
                <div className="flex gap-2">
                  {unsavedCount > 0 && (
                    <button
                      onClick={saveAllImages}
                      className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      전체 저장 ({unsavedCount})
                    </button>
                  )}
                  <button
                    onClick={downloadAllImages}
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    전체 다운로드
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-200px)]">
            {generatedImages.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm">생성된 이미지가 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                {generatedImages.map((image) => (
                  <div
                    key={image.id}
                    className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    {/* 이미지 */}
                    <div className="relative aspect-video">
                      <img
                        src={`data:image/png;base64,${image.imageBase64}`}
                        alt={image.prompt}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => downloadImage(image.imageBase64, image.prompt, image.timestamp)}
                      />
                      {/* 저장 상태 배지 */}
                      {image.saved && (
                        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                          ✓ 저장됨
                        </div>
                      )}
                    </div>

                    {/* 카드 내용 */}
                    <div className="p-3">
                      {/* 프롬프트 */}
                      <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                        {image.prompt}
                      </p>

                      {/* 메타 정보 */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <span className="bg-slate-700 px-2 py-0.5 rounded">
                          {image.aspectRatio}
                        </span>
                        <span className="bg-slate-700 px-2 py-0.5 rounded">
                          {image.style}
                        </span>
                      </div>

                      {/* 파일명 */}
                      <p className="text-xs text-slate-500 truncate mb-3">
                        {generateFilename(image.prompt, image.timestamp)}
                      </p>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadImage(image.imageBase64, image.prompt, image.timestamp)}
                          className="flex-1 px-3 py-2 text-xs bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                        >
                          다운로드
                        </button>
                        <button
                          onClick={() => saveImageToDatabase(image.id)}
                          disabled={image.saved || image.saving}
                          className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${
                            image.saved
                              ? 'bg-green-700 text-green-200 cursor-default'
                              : image.saving
                              ? 'bg-slate-600 text-slate-400 cursor-wait'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {image.saved ? '✓ 저장됨' : image.saving ? '저장 중...' : 'DB 저장'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
