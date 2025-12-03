'use client';

import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="p-6 bg-slate-900 min-h-full">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">대시보드</h1>
        <p className="text-slate-400 mt-1">YouTube 콘텐츠 분석 및 자동화 워크플로우</p>
      </div>

      {/* 빠른 시작 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">빠른 시작</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Link
            href="/search"
            className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 hover:from-purple-500 hover:to-purple-600 transition-all"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-2">새 검색 시작</h3>
            <p className="text-purple-200 text-sm">키워드로 YouTube 영상을 검색하고 터짐 지수를 분석합니다.</p>
          </Link>

          <Link
            href="/scripts"
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 hover:from-blue-500 hover:to-blue-600 transition-all"
          >
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-white mb-2">대본 생성</h3>
            <p className="text-blue-200 text-sm">Gemini AI로 유튜브 대본을 생성합니다.</p>
          </Link>

          <Link
            href="/characters"
            className="bg-gradient-to-r from-pink-600 to-pink-700 rounded-xl p-6 hover:from-pink-500 hover:to-pink-600 transition-all"
          >
            <div className="text-3xl mb-3">👤</div>
            <h3 className="text-lg font-semibold text-white mb-2">캐릭터 설정</h3>
            <p className="text-pink-200 text-sm">채팅으로 캐릭터를 만들고 이미지를 생성합니다.</p>
          </Link>

          <Link
            href="/images"
            className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-6 hover:from-amber-500 hover:to-orange-500 transition-all"
          >
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="text-lg font-semibold text-white mb-2">이미지 생성</h3>
            <p className="text-amber-200 text-sm">채팅과 이미지 첨부로 AI 이미지를 생성합니다.</p>
          </Link>

          <Link
            href="/videos"
            className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            <div className="text-3xl mb-3">🎥</div>
            <h3 className="text-lg font-semibold text-white mb-2">AI 영상 생성</h3>
            <p className="text-purple-200 text-sm">Veo 3.1로 채팅과 이미지로 AI 영상을 생성합니다.</p>
          </Link>

          <Link
            href="/projects"
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:bg-slate-750 hover:border-slate-600 transition-all"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">프로젝트 목록</h3>
            <p className="text-slate-400 text-sm">진행 중인 프로젝트를 확인하고 관리합니다.</p>
          </Link>
        </div>
      </div>

      {/* 워크플로우 안내 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">워크플로우 단계</h2>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
            {[
              { step: 1, name: '검색', icon: '🔍' },
              { step: 2, name: '분석', icon: '📊' },
              { step: 3, name: '댓글', icon: '💬' },
              { step: 4, name: '대본', icon: '📝' },
              { step: 5, name: '캐릭터', icon: '👤' },
              { step: 6, name: '이미지', icon: '🎨' },
              { step: 7, name: '음성', icon: '🎙️' },
              { step: 8, name: 'AI영상', icon: '🎬' },
              { step: 9, name: '업로드', icon: '📤' },
            ].map((item, index) => (
              <div key={item.step} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-xl mb-2">
                  {item.icon}
                </div>
                <span className="text-xs text-slate-400 text-center">{item.name}</span>
                {index < 8 && (
                  <div className="hidden md:block absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-sm text-center mt-4">
            키워드 검색부터 영상 업로드까지 자동화된 워크플로우
          </p>
        </div>
      </div>

      {/* 최근 프로젝트 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">최근 프로젝트</h2>
          <Link href="/projects" className="text-purple-400 hover:text-purple-300 text-sm">
            전체 보기 →
          </Link>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-slate-400 mb-4">아직 프로젝트가 없습니다.</p>
            <Link
              href="/search"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <span className="mr-2">🔍</span>
              첫 검색 시작하기
            </Link>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-sm text-slate-400">총 프로젝트</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-emerald-400">0</div>
          <div className="text-sm text-slate-400">생성된 영상</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-blue-400">0</div>
          <div className="text-sm text-slate-400">분석된 댓글</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-purple-400">0</div>
          <div className="text-sm text-slate-400">업로드 완료</div>
        </div>
      </div>
    </div>
  );
}
