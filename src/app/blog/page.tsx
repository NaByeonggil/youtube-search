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

interface BlogSection {
  heading: string;
  content: string;
}

interface GeneratedBlog {
  title: string;
  metaDescription: string;
  introduction: string;
  sections: BlogSection[];
  conclusion: string;
  tags: string[];
  estimatedReadTime: string;
}

interface AnalysisContext {
  type: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl?: string;
  positiveSummary: string;
  negativeSummary: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
  improvementSuggestions: string;
}

export default function BlogPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: '안녕하세요! Gemini AI 기반 블로그 글 생성을 도와드리겠습니다. 어떤 주제의 블로그를 작성하고 싶으신가요?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [generatedBlog, setGeneratedBlog] = useState<GeneratedBlog | null>(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBlogId, setSavedBlogId] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(true);
  const [blogOptions, setBlogOptions] = useState({
    targetAudience: '',
    toneAndManner: '',
    keywords: '',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 댓글 분석 데이터가 있으면 컨텍스트로 활용
  useEffect(() => {
    const storedAnalysis = sessionStorage.getItem('analysisContext');
    if (storedAnalysis) {
      try {
        const analysis: AnalysisContext = JSON.parse(storedAnalysis);
        if (analysis.type === 'comment-analysis') {
          setAnalysisContext(analysis);
          setTopic(analysis.videoTitle);

          // 분석 컨텍스트 메시지 추가
          const analysisMessage: Message = {
            id: Date.now().toString(),
            role: 'system',
            content: `📊 **댓글 분석 기반 블로그 생성 모드**\n\n**영상**: ${analysis.videoTitle}\n**채널**: ${analysis.channelName}\n\n👍 **시청자들이 좋아한 점**:\n${analysis.positiveSummary}\n${analysis.positiveKeywords?.length > 0 ? `키워드: ${analysis.positiveKeywords.join(', ')}` : ''}\n\n👎 **개선이 필요한 점**:\n${analysis.negativeSummary}\n${analysis.negativeKeywords?.length > 0 ? `키워드: ${analysis.negativeKeywords.join(', ')}` : ''}\n\n💡 **개선 제안**:\n${analysis.improvementSuggestions || '없음'}\n\n위 분석 내용을 바탕으로 블로그 글을 작성해드릴게요. 원하시는 방향이나 추가 요청사항을 말씀해주세요!`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, analysisMessage]);

          // sessionStorage 정리
          sessionStorage.removeItem('analysisContext');
        }
      } catch (e) {
        console.error('Failed to parse analysis data:', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setSavedBlogId(null);

    try {
      // 분석 컨텍스트가 있으면 활용
      const contextInfo = analysisContext ? `
[댓글 분석 컨텍스트]
영상 제목: ${analysisContext.videoTitle}
채널: ${analysisContext.channelName}
긍정적 반응: ${analysisContext.positiveSummary}
부정적 반응: ${analysisContext.negativeSummary}
개선 제안: ${analysisContext.improvementSuggestions}
긍정 키워드: ${analysisContext.positiveKeywords?.join(', ')}
부정 키워드: ${analysisContext.negativeKeywords?.join(', ')}
` : '';

      // 옵션 정보 구성
      const optionsInfo = [];
      if (blogOptions.targetAudience) {
        optionsInfo.push(`타겟 독자: ${blogOptions.targetAudience}`);
      }
      if (blogOptions.toneAndManner) {
        optionsInfo.push(`분위기/톤: ${blogOptions.toneAndManner}`);
      }
      if (blogOptions.keywords) {
        optionsInfo.push(`키워드: ${blogOptions.keywords}`);
      }
      const optionsContext = optionsInfo.length > 0 ? `\n[블로그 옵션]\n${optionsInfo.join('\n')}` : '';

      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentIdea: {
            title: topic || input,
            description: input,
            targetAudience: blogOptions.targetAudience || '일반 독자',
            estimatedViralScore: '중',
            reasoning: analysisContext ? '댓글 분석 기반' : '사용자 요청',
            suggestedFormat: '롱폼',
          },
          customTarget: blogOptions.targetAudience || undefined,
          toneAndManner: blogOptions.toneAndManner || undefined,
          additionalContext: contextInfo + optionsContext + `\n사용자 요청: ${input}`,
        }),
      });

      const data = await res.json();

      if (data.success && data.data?.blogPost) {
        const blog = data.data.blogPost;
        setGeneratedBlog(blog);
        setTopic(blog.title);

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `블로그 글이 생성되었습니다!\n\n**제목**: ${blog.title}\n**예상 읽기 시간**: ${blog.estimatedReadTime}\n**태그**: ${blog.tags?.join(', ')}\n\n[블로그 보기] 버튼을 클릭하여 전체 내용을 확인하세요.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setShowBlogModal(true);
      } else {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `죄송합니다. 블로그 생성 중 오류가 발생했습니다: ${data.error || '알 수 없는 오류'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Blog generation error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '블로그 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBlog = async () => {
    if (!generatedBlog) return;

    setSaving(true);
    try {
      const res = await fetch('/api/blog/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogPost: {
            title: generatedBlog.title,
            metaDescription: generatedBlog.metaDescription,
            introduction: generatedBlog.introduction,
            sections: generatedBlog.sections,
            conclusion: generatedBlog.conclusion,
            tags: generatedBlog.tags,
            estimatedReadTime: generatedBlog.estimatedReadTime,
          },
          sourceVideo: analysisContext ? {
            videoId: analysisContext.videoId,
            title: analysisContext.videoTitle,
            channelName: analysisContext.channelName,
          } : undefined,
          idea: {
            title: topic,
            description: '',
            targetAudience: blogOptions.targetAudience || '일반 독자',
          },
          options: {
            customTarget: blogOptions.targetAudience || undefined,
            toneAndManner: blogOptions.toneAndManner || undefined,
          },
        }),
      });

      const data = await res.json();

      if (data.success && data.data?.id) {
        setSavedBlogId(data.data.id);
        const saveMessage: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: `블로그가 성공적으로 저장되었습니다! (ID: ${data.data.id})`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, saveMessage]);
      } else {
        alert(`저장 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const copyBlogToClipboard = () => {
    if (!generatedBlog) return;

    const blogText = `# ${generatedBlog.title}

${generatedBlog.introduction}

${generatedBlog.sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n')}

## 마무리

${generatedBlog.conclusion}

---
태그: ${generatedBlog.tags?.join(', ')}
예상 읽기 시간: ${generatedBlog.estimatedReadTime}
`;

    navigator.clipboard.writeText(blogText);
    alert('블로그 내용이 클립보드에 복사되었습니다!');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* 헤더 */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-sm text-slate-400 mb-1">
              <Link href="/" className="hover:text-white">홈</Link>
              <span>/</span>
              <span className="text-white">블로그 생성</span>
            </div>
            <h1 className="text-xl font-bold text-white">AI 블로그 생성</h1>
          </div>
          <div className="flex items-center space-x-2">
            {generatedBlog && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBlogModal(true)}
              >
                블로그 보기
              </Button>
            )}
            <Link href="/blog/history">
              <Button variant="outline" size="sm">
                저장된 블로그
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 옵션 패널 */}
      <div className="border-b border-slate-700">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">⚙️</span>
            <span className="text-sm font-medium text-slate-300">블로그 생성 옵션</span>
            {(blogOptions.targetAudience || blogOptions.toneAndManner || blogOptions.keywords) && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                설정됨
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${showOptions ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showOptions && (
          <div className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 타겟 독자 */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  🎯 타겟 독자
                </label>
                <input
                  type="text"
                  value={blogOptions.targetAudience}
                  onChange={(e) => setBlogOptions(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="예: 20대 직장인, 마케터, 초보 개발자"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* 분위기/톤앤매너 */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  🎨 분위기 / 톤앤매너
                </label>
                <input
                  type="text"
                  value={blogOptions.toneAndManner}
                  onChange={(e) => setBlogOptions(prev => ({ ...prev, toneAndManner: e.target.value }))}
                  placeholder="예: 친근한, 전문적인, 유머러스한"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* 키워드 */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  🏷️ 키워드
                </label>
                <input
                  type="text"
                  value={blogOptions.keywords}
                  onChange={(e) => setBlogOptions(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="예: SEO, 트렌드, 실용적 (쉼표로 구분)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* 빠른 선택 버튼 */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">빠른 선택:</span>
              <button
                type="button"
                onClick={() => setBlogOptions(prev => ({ ...prev, toneAndManner: '친근하고 쉬운' }))}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
              >
                친근한
              </button>
              <button
                type="button"
                onClick={() => setBlogOptions(prev => ({ ...prev, toneAndManner: '전문적이고 신뢰감 있는' }))}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
              >
                전문적인
              </button>
              <button
                type="button"
                onClick={() => setBlogOptions(prev => ({ ...prev, toneAndManner: '유머러스하고 재미있는' }))}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
              >
                유머러스
              </button>
              <button
                type="button"
                onClick={() => setBlogOptions(prev => ({ ...prev, toneAndManner: '감성적이고 공감가는' }))}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
              >
                감성적인
              </button>
              <button
                type="button"
                onClick={() => setBlogOptions({ targetAudience: '', toneAndManner: '', keywords: '' })}
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
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
                  : 'bg-slate-800 text-white border border-slate-700'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-2 opacity-60">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                <span className="text-slate-400">블로그를 생성하고 있습니다...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-slate-700 p-4">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="블로그 주제나 요청사항을 입력하세요..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? '생성 중...' : '생성'}
          </Button>
        </form>
      </div>

      {/* 블로그 모달 */}
      {showBlogModal && generatedBlog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">생성된 블로그</h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBlogToClipboard}
                >
                  복사
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveBlog}
                  disabled={saving || savedBlogId !== null}
                >
                  {saving ? '저장 중...' : savedBlogId ? '저장됨' : '저장'}
                </Button>
                <button
                  onClick={() => setShowBlogModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 제목 */}
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{generatedBlog.title}</h1>
                <p className="text-slate-400 text-sm">
                  예상 읽기 시간: {generatedBlog.estimatedReadTime}
                </p>
              </div>

              {/* 메타 설명 */}
              <Card>
                <CardContent>
                  <h3 className="text-sm font-medium text-slate-400 mb-1">메타 설명</h3>
                  <p className="text-white">{generatedBlog.metaDescription}</p>
                </CardContent>
              </Card>

              {/* 서론 */}
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">서론</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{generatedBlog.introduction}</p>
              </div>

              {/* 본문 섹션 */}
              {generatedBlog.sections.map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">{section.heading}</h3>
                  <p className="text-slate-300 whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}

              {/* 결론 */}
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">마무리</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{generatedBlog.conclusion}</p>
              </div>

              {/* 태그 */}
              {generatedBlog.tags && generatedBlog.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {generatedBlog.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
