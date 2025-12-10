'use client';

import Link from 'next/link';

interface HeaderProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

export default function Header({ onMenuToggle, isSidebarOpen }: HeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          {/* 모바일 메뉴 버튼 + Logo */}
          <div className="flex items-center space-x-3">
            {/* 햄버거 메뉴 (모바일) */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="메뉴 토글"
            >
              {isSidebarOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">📺</span>
              <span className="text-lg sm:text-xl font-bold text-red-500 truncate">
                <span className="hidden sm:inline">나약사 유튜브 검색기</span>
                <span className="sm:hidden">나약사</span>
              </span>
            </Link>
          </div>

          {/* 포맷 선택 - 태블릿 이상에서만 표시 */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center bg-slate-800 rounded-lg p-1">
              <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-purple-600 text-white">
                롱폼
              </button>
              <button className="px-4 py-1.5 text-sm font-medium text-slate-400 hover:text-white">
                숏폼
              </button>
            </div>
          </div>

          {/* 설정 */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* 모바일용 포맷 선택 드롭다운 대체 */}
            <div className="md:hidden flex items-center bg-slate-800 rounded-lg p-0.5">
              <button className="px-2 py-1 text-xs font-medium rounded bg-purple-600 text-white">
                롱폼
              </button>
              <button className="px-2 py-1 text-xs font-medium text-slate-400">
                숏폼
              </button>
            </div>

            <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
