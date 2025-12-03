'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'supporting';
  type: string;
  personality: string;
}

interface ScriptScene {
  sceneNumber: number;
  timeRange: string;
  description: string;
  script: string;
  visualNote: string;
}

interface GeneratedScript {
  fullScript: string;
  hook: string;
  intro: string;
  body: string;
  conclusion: string;
  estimatedDuration: number;
  scenes?: ScriptScene[];
}

export default function ScriptsPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: '안녕하세요! Gemini AI 기반 대본 생성을 도와드리겠습니다. 어떤 주제의 영상을 만들고 싶으신가요?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [format, setFormat] = useState<'long' | 'short'>('long');
  const [topic, setTopic] = useState('');
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // 주제 추출
    if (!topic && input.length > 5) {
      setTopic(input.trim());
    }

    setInput('');
    setLoading(true);

    try {
      // Gemini AI API 호출
      const res = await fetch('/api/scripts/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          format,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'AI 응답 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const addCharacter = (character: Omit<Character, 'id'>) => {
    const newCharacter: Character = {
      ...character,
      id: Date.now().toString(),
    };
    setCharacters((prev) => [...prev, newCharacter]);
  };

  const removeCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  const generateScript = async () => {
    if (!topic) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: '대본을 생성하려면 먼저 주제를 입력해주세요.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    setLoading(true);

    const systemMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: `🎬 Gemini AI가 "${topic}" 주제로 ${format === 'short' ? '숏폼(60초)' : '롱폼(5분)'} 대본을 생성하고 있습니다...`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMessage]);

    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: {
            topic,
            oneLineSummary: topic,
          },
          format,
          targetAudience: '일반 시청자',
          characters: characters.map((c) => ({
            name: c.name,
            role: c.role,
            type: c.type,
            personality: c.personality,
          })),
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setGeneratedScript(data.data);

        // 대본 내용을 메시지로 표시
        const scriptContent = formatScriptForDisplay(data.data);
        const scriptMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: scriptContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, scriptMessage]);
      } else {
        throw new Error(data.error || '대본 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Error generating script:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `대본 생성 중 오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const formatScriptForDisplay = (script: GeneratedScript): string => {
    let content = `## ✅ 대본 생성 완료!\n\n`;
    content += `**예상 길이**: ${script.estimatedDuration}초\n\n`;

    if (script.scenes && script.scenes.length > 0) {
      script.scenes.forEach((scene) => {
        content += `### 장면 ${scene.sceneNumber}: ${scene.timeRange}\n`;
        content += `**화면**: ${scene.description}\n`;
        content += `**대사/나레이션**: ${scene.script}\n`;
        if (scene.visualNote) {
          content += `📌 *연출 노트*: ${scene.visualNote}\n`;
        }
        content += '\n';
      });
    } else {
      if (script.hook) {
        content += `### 🎣 훅 (오프닝)\n${script.hook}\n\n`;
      }
      if (script.intro) {
        content += `### 📖 도입부\n${script.intro}\n\n`;
      }
      if (script.body) {
        content += `### 📝 본론\n${script.body}\n\n`;
      }
      if (script.conclusion) {
        content += `### 🎬 결론\n${script.conclusion}\n\n`;
      }
    }

    content += `---\n💡 **전체 대본 보기** 버튼을 클릭하면 전체 대본을 확인할 수 있습니다.`;

    return content;
  };

  const copyScript = () => {
    if (generatedScript?.fullScript) {
      navigator.clipboard.writeText(generatedScript.fullScript);
      alert('대본이 클립보드에 복사되었습니다!');
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-full flex flex-col">
      {/* 페이지 헤더 */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">대본 생성</h1>
        <p className="text-slate-400 mt-1">
          Gemini AI (<span className="text-purple-400">gemini-3-pro-preview</span>)와 대화하며 대본을 작성합니다.
        </p>
      </div>

      <div className="flex gap-6 flex-1">
        {/* 채팅 영역 */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardContent className="flex-1 flex flex-col p-0">
              {/* 메시지 목록 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : message.role === 'system'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center space-x-2 mb-2 text-purple-400 text-sm">
                          <span>🤖</span>
                          <span>Gemini AI</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 rounded-lg p-4 text-slate-300">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                        <div>Gemini AI가 생각하는 중...</div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 입력 영역 */}
              <div className="border-t border-slate-700 p-4">
                <form onSubmit={handleSend} className="flex space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    disabled={loading}
                  />
                  <Button type="submit" disabled={loading || !input.trim()}>
                    전송
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 - 캐릭터 및 설정 */}
        <div className="w-80 space-y-4">
          {/* 포맷 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">콘텐츠 형식</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFormat('long')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    format === 'long'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  📺 롱폼 (5분)
                </button>
                <button
                  onClick={() => setFormat('short')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    format === 'short'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  📱 숏폼 (60초)
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 주제 입력 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">영상 주제</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 건강한 다이어트 방법"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:border-purple-500"
              />
            </CardContent>
          </Card>

          {/* 캐릭터 목록 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">캐릭터 설정</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCharacterModal(true)}
                >
                  + 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {characters.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  아직 캐릭터가 없습니다.<br />
                  캐릭터를 추가해주세요.
                </p>
              ) : (
                <div className="space-y-2">
                  {characters.map((char) => (
                    <div
                      key={char.id}
                      className="p-3 bg-slate-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">
                            {char.role === 'protagonist' ? '⭐' : '👤'}
                          </span>
                          <div>
                            <p className="text-white font-medium">{char.name}</p>
                            <p className="text-slate-400 text-xs">{char.type}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeCharacter(char.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 빠른 액션 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">빠른 입력</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => setInput('숏폼 60초 영상으로 만들고 싶어요')}
                className="w-full p-2 text-left text-sm text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
              >
                숏폼 60초 영상
              </button>
              <button
                onClick={() => setInput('롱폼 5분 영상으로 만들고 싶어요')}
                className="w-full p-2 text-left text-sm text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
              >
                롱폼 5분 영상
              </button>
              <button
                onClick={() => setInput('캐릭터 설정을 하고 싶어요')}
                className="w-full p-2 text-left text-sm text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
              >
                캐릭터 설정하기
              </button>
            </CardContent>
          </Card>

          {/* 대본 생성 버튼 */}
          <Card className="border-purple-500">
            <CardContent className="py-4">
              <Button
                onClick={generateScript}
                className="w-full"
                disabled={loading || !topic}
              >
                <span className="mr-2">📝</span>
                Gemini AI로 대본 생성
              </Button>
              <p className="text-xs text-slate-400 text-center mt-2">
                {topic ? `"${topic}" 주제로 대본을 생성합니다.` : '먼저 주제를 입력해주세요.'}
              </p>
            </CardContent>
          </Card>

          {/* 전체 대본 보기 버튼 */}
          {generatedScript && (
            <Card>
              <CardContent className="py-4 space-y-2">
                <Button
                  onClick={() => setShowScriptModal(true)}
                  variant="outline"
                  className="w-full"
                >
                  📄 전체 대본 보기
                </Button>
                <Button
                  onClick={copyScript}
                  variant="outline"
                  className="w-full"
                >
                  📋 대본 복사하기
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 다음 단계 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">다음 단계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/characters" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <span className="mr-2">👤</span>
                  캐릭터 상세 설정
                </Button>
              </Link>
              <Link href="/images" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <span className="mr-2">🎨</span>
                  이미지 생성
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 캐릭터 추가 모달 */}
      {showCharacterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>캐릭터 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addCharacter({
                    name: formData.get('name') as string,
                    role: formData.get('role') as 'protagonist' | 'supporting',
                    type: formData.get('type') as string,
                    personality: formData.get('personality') as string,
                  });
                  setShowCharacterModal(false);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    역할
                  </label>
                  <select
                    name="role"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  >
                    <option value="protagonist">주인공</option>
                    <option value="supporting">조연</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    이름
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="예: 김지영"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    직업/타입
                  </label>
                  <input
                    type="text"
                    name="type"
                    placeholder="예: 30대 직장인"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    성격
                  </label>
                  <input
                    type="text"
                    name="personality"
                    placeholder="예: 밝고 긍정적인"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                    required
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCharacterModal(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit" className="flex-1">
                    추가
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 전체 대본 모달 */}
      {showScriptModal && generatedScript && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>전체 대본</CardTitle>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="bg-slate-700 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-white text-sm">
                  {generatedScript.fullScript}
                </pre>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button onClick={copyScript} variant="outline">
                  📋 복사하기
                </Button>
                <Button onClick={() => setShowScriptModal(false)}>
                  닫기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
