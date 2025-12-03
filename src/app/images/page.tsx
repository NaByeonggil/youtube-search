'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';

interface AttachedImage {
  id: string;
  base64: string;
  mimeType: string;
  name: string;
  preview: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachedImages?: AttachedImage[];
  imagePrompt?: string;
  generatedImage?: GeneratedImage | null;
  timestamp: Date;
}

interface GeneratedImage {
  base64: string;
  mimeType: string;
  revisedPrompt?: string;
  fileName?: string;
  filePath?: string;
}

export default function ImagesPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '안녕하세요! 이미지 생성을 도와드리겠습니다. 🎨\n\n원하시는 이미지를 설명해주세요. 예를 들어:\n- "밤하늘 아래 도시 풍경"\n- "귀여운 고양이 캐릭터"\n- "전문적인 유튜브 썸네일"\n\n참고할 이미지가 있다면 첨부해주세요!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [format, setFormat] = useState<'long' | 'short'>('long');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 이미지 파일 처리
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
        base64: base64.split(',')[1], // data:image/... 부분 제거
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

  const sendMessage = async (generateImage = false) => {
    if (!input.trim() && !generateImage && attachedImages.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: generateImage ? '이 프롬프트로 이미지를 생성해주세요' : input,
      attachedImages: attachedImages.length > 0 ? [...attachedImages] : undefined,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    const currentAttached = [...attachedImages];
    setAttachedImages([]);
    setIsLoading(true);

    try {
      // API 호출용 메시지 포맷
      const apiMessages = newMessages
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      // 첨부 이미지 포맷
      const apiAttachedImages = currentAttached.map(img => ({
        base64: img.base64,
        mimeType: img.mimeType,
      }));

      const response = await fetch('/api/images/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          format,
          attachedImages: apiAttachedImages,
          generateImage,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.data.response,
          imagePrompt: result.data.imagePrompt,
          generatedImage: result.data.image,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (result.data.imagePrompt) {
          setCurrentPrompt(result.data.imagePrompt);
        }

        if (result.data.image) {
          setGeneratedImages(prev => [result.data.image, ...prev]);
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
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `오류가 발생했습니다: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImageFromPrompt = () => {
    sendMessage(true);
  };

  const downloadImage = (image: GeneratedImage, index: number) => {
    const link = document.createElement('a');
    link.href = `data:${image.mimeType};base64,${image.base64}`;
    link.download = `generated_image_${index + 1}.png`;
    link.click();
  };

  const resetChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '새로운 이미지를 만들어볼까요? 🎨\n\n원하시는 이미지를 설명해주세요!',
        timestamp: new Date(),
      },
    ]);
    setCurrentPrompt(null);
    setAttachedImages([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                ← 홈
              </Link>
              <h1 className="text-xl font-bold">이미지 생성</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Gemini Image
              </span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={format}
                onChange={e => setFormat(e.target.value as 'long' | 'short')}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="long">롱폼 (16:9)</option>
                <option value="short">숏폼 (9:16)</option>
              </select>
              <button
                onClick={resetChat}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border rounded-lg"
              >
                새로 시작
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {/* Messages */}
              <div className="h-[500px] overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
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
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}

                      {/* 이미지 프롬프트 */}
                      {message.imagePrompt && (
                        <div className="mt-3 p-3 bg-white rounded-lg border text-gray-800">
                          <h4 className="font-bold text-sm mb-1">생성 프롬프트:</h4>
                          <p className="text-xs text-gray-600">{message.imagePrompt}</p>
                        </div>
                      )}

                      {/* 생성된 이미지 */}
                      {message.generatedImage && (
                        <div className="mt-3">
                          <img
                            src={`data:${message.generatedImage.mimeType};base64,${message.generatedImage.base64}`}
                            alt="Generated"
                            className="rounded-lg max-w-full cursor-pointer hover:opacity-90"
                            onClick={() => downloadImage(message.generatedImage!, 0)}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            클릭하여 다운로드
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="text-gray-600">이미지 생성 중...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Attached Images Preview */}
              {attachedImages.length > 0 && (
                <div className="border-t px-4 py-2 bg-gray-50">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs text-gray-500">첨부:</span>
                    {attachedImages.map(img => (
                      <div key={img.id} className="relative">
                        <img
                          src={img.preview}
                          alt={img.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeAttachedImage(img.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  {/* 파일 첨부 버튼 */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-3 border rounded-xl hover:bg-gray-50 text-gray-600"
                    title="이미지 첨부"
                  >
                    📎
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="원하는 이미지를 설명해주세요..."
                    className="flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    전송
                  </button>
                </div>

                {/* Quick Actions */}
                {currentPrompt && (
                  <div className="mt-3">
                    <button
                      onClick={generateImageFromPrompt}
                      disabled={isLoading}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-medium"
                    >
                      🎨 이미지 생성하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Generated Images Gallery */}
            {generatedImages.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-bold text-lg mb-3">생성된 이미지</h3>
                <div className="grid grid-cols-2 gap-2">
                  {generatedImages.slice(0, 6).map((img, idx) => (
                    <div
                      key={idx}
                      className="relative cursor-pointer group"
                      onClick={() => downloadImage(img, idx)}
                    >
                      <img
                        src={`data:${img.mimeType};base64,${img.base64}`}
                        alt={`Generated ${idx + 1}`}
                        className="w-full aspect-video object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100">
                          ⬇️
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {generatedImages.length > 6 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    +{generatedImages.length - 6}개 더 보기
                  </p>
                )}
              </div>
            )}

            {/* Current Prompt */}
            {currentPrompt && (
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-bold text-lg mb-2">현재 프롬프트</h3>
                <p className="text-sm text-gray-600 break-words">{currentPrompt}</p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="font-bold text-purple-800 mb-2">💡 이미지 생성 팁</h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• 구체적으로 묘사할수록 좋은 결과</li>
                <li>• 참고 이미지를 첨부하면 더 정확해요</li>
                <li>• 스타일(실사, 일러스트 등) 명시</li>
                <li>• 구도와 조명을 설명해주세요</li>
              </ul>
            </div>

            {/* Quick Prompts */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-bold text-lg mb-3">빠른 시작</h3>
              <div className="space-y-2">
                {[
                  '유튜브 썸네일 (화려한 배경)',
                  '전문가 프로필 사진',
                  '제품 소개 이미지',
                  '자연 풍경 배경',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(prompt)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Info */}
            <div className="bg-gray-100 rounded-xl p-4">
              <h3 className="font-bold text-gray-700 mb-2">🤖 사용 모델</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">채팅:</span> gemini-2.0-flash
                </p>
                <p>
                  <span className="font-medium">이미지:</span> gemini-3-pro-preview
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
