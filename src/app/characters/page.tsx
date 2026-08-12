'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  character?: CharacterInfo | null;
  image?: ImageInfo | null;
  timestamp: Date;
}

interface CharacterInfo {
  name: string;
  type: string;
  personality: string;
  appearance: string;
  role: string;
  voiceTone: string;
  catchphrase: string;
}

interface ImageInfo {
  base64: string;
  mimeType: string;
  revisedPrompt?: string;
  fileName?: string;
  filePath?: string;
}

export default function CharactersPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '안녕하세요! 유튜브 콘텐츠용 캐릭터 설정을 도와드리겠습니다. 🎬\n\n어떤 캐릭터를 만들고 싶으신가요? 예를 들어:\n- "친근한 약사 캐릭터를 만들고 싶어요"\n- "전문적인 해설자 캐릭터가 필요해요"\n- "귀여운 마스코트 캐릭터를 원해요"\n\n자유롭게 설명해주세요!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentCharacter, setCurrentCharacter] = useState<CharacterInfo | null>(null);
  const [format, setFormat] = useState<'long' | 'short'>('long');
  const [savedCharacters, setSavedCharacters] = useState<CharacterInfo[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (generateImage = false) => {
    if (!input.trim() && !generateImage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: generateImage ? '이미지를 생성해주세요' : input,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // API 호출용 메시지 포맷
      const apiMessages = newMessages
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch('/api/images/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          format,
          generateImage,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.data.response,
          character: result.data.character,
          image: result.data.image,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (result.data.character) {
          setCurrentCharacter(result.data.character);
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

  const generateCharacterImage = () => {
    sendMessage(true);
  };

  const saveCharacter = () => {
    if (currentCharacter) {
      setSavedCharacters(prev => [...prev, currentCharacter]);
      alert(`캐릭터 "${currentCharacter.name}"이(가) 저장되었습니다!`);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '안녕하세요! 새로운 캐릭터를 만들어볼까요? 🎬\n\n어떤 캐릭터를 원하시나요?',
        timestamp: new Date(),
      },
    ]);
    setCurrentCharacter(null);
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
              <h1 className="text-xl font-bold">캐릭터 설정</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Gemini AI + Image
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
                새 캐릭터
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

                      {/* 캐릭터 정보 카드 */}
                      {message.character && (
                        <div className="mt-3 p-3 bg-white rounded-lg border text-gray-800">
                          <h4 className="font-bold text-sm mb-2">
                            캐릭터: {message.character.name}
                          </h4>
                          <div className="text-xs space-y-1">
                            <p>
                              <span className="text-gray-500">유형:</span>{' '}
                              {message.character.type}
                            </p>
                            <p>
                              <span className="text-gray-500">성격:</span>{' '}
                              {message.character.personality}
                            </p>
                            <p>
                              <span className="text-gray-500">역할:</span>{' '}
                              {message.character.role}
                            </p>
                            {message.character.catchphrase && (
                              <p>
                                <span className="text-gray-500">대사:</span> "
                                {message.character.catchphrase}"
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 생성된 이미지 */}
                      {message.image && (
                        <div className="mt-3">
                          <img
                            src={`data:${message.image.mimeType};base64,${message.image.base64}`}
                            alt="Generated character"
                            className="rounded-lg max-w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Gemini Image로 생성됨
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
                        <span className="text-gray-600">생각하는 중...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="캐릭터에 대해 설명해주세요..."
                    className="flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !input.trim()}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    전송
                  </button>
                </div>

                {/* Quick Actions */}
                {currentCharacter && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={generateCharacterImage}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                    >
                      🎨 이미지 생성
                    </button>
                    <button
                      onClick={saveCharacter}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      💾 캐릭터 저장
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Character */}
            {currentCharacter && (
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-bold text-lg mb-3">현재 캐릭터</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">이름</label>
                    <p className="font-medium">{currentCharacter.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">유형</label>
                    <p>{currentCharacter.type}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">성격</label>
                    <p>{currentCharacter.personality}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">외모</label>
                    <p className="text-sm">{currentCharacter.appearance}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">역할</label>
                    <p>{currentCharacter.role}</p>
                  </div>
                  {currentCharacter.voiceTone && (
                    <div>
                      <label className="text-xs text-gray-500">말투</label>
                      <p>{currentCharacter.voiceTone}</p>
                    </div>
                  )}
                  {currentCharacter.catchphrase && (
                    <div>
                      <label className="text-xs text-gray-500">대표 대사</label>
                      <p className="italic">"{currentCharacter.catchphrase}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Saved Characters */}
            {savedCharacters.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-bold text-lg mb-3">저장된 캐릭터</h3>
                <div className="space-y-2">
                  {savedCharacters.map((char, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                      onClick={() => setCurrentCharacter(char)}
                    >
                      <p className="font-medium">{char.name}</p>
                      <p className="text-sm text-gray-500">{char.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-bold text-blue-800 mb-2">💡 캐릭터 설정 팁</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 캐릭터의 역할을 명확히 설명하세요</li>
                <li>• 외모와 성격을 구체적으로 묘사하세요</li>
                <li>• 타겟 시청자를 고려하세요</li>
                <li>• 독특한 말투나 대사를 추가하세요</li>
              </ul>
            </div>

            {/* Model Info */}
            <div className="bg-gray-100 rounded-xl p-4">
              <h3 className="font-bold text-gray-700 mb-2">🤖 사용 모델</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">채팅:</span> gemini-3.6-flash
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
