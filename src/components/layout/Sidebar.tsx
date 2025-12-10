'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface SubItem {
  name: string;
  href: string;
  icon: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
  step?: number;
  subItems?: SubItem[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems: NavItem[] = [
  { name: '대시보드', href: '/', icon: '🏠' },
  { name: '키워드 검색', href: '/search', icon: '🔍', step: 1 },
  { name: '영상 분석', href: '/projects', icon: '📊', step: 2 },
  {
    name: '댓글 분석',
    href: '/analysis',
    icon: '💬',
    step: 3,
    subItems: [
      { name: '키워드 검색', href: '/analysis', icon: '🔍' },
      { name: '불러오기', href: '/analysis/history', icon: '📂' },
    ]
  },
  {
    name: '대본 생성',
    href: '/scripts',
    icon: '📝',
    step: 4,
    subItems: [
      { name: '대본 작성', href: '/scripts', icon: '✏️' },
      { name: '불러오기', href: '/scripts/history', icon: '📂' },
    ]
  },
  { name: '대본 구조 분석', href: '/script-analysis', icon: '📋', step: 5 },
  { name: '캐릭터 설정', href: '/characters', icon: '👤', step: 6 },
  {
    name: '이미지 생성',
    href: '/images',
    icon: '🎨',
    step: 7,
    subItems: [
      { name: '대본 → 이미지', href: '/images', icon: '📝' },
      { name: '생성 기록', href: '/images/history', icon: '📂' },
    ]
  },
  { name: '음성 합성', href: '/tts', icon: '🎙️', step: 8 },
  { name: 'AI 영상 생성', href: '/videos', icon: '🎬', step: 9 },
  { name: '업로드', href: '/upload', icon: '📤', step: 10 },
];

const bottomItems: NavItem[] = [
  {
    name: '설정',
    href: '/settings',
    icon: '⚙️',
    subItems: [
      { name: 'API 키 설정', href: '/settings/api', icon: '🔑' },
    ]
  },
];

const adminItems: NavItem[] = [
  {
    name: '관리자',
    href: '/admin',
    icon: '👑',
    subItems: [
      { name: '대시보드', href: '/admin', icon: '📊' },
      { name: '사용자 관리', href: '/admin/users', icon: '👥' },
    ]
  },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['/analysis', '/scripts', '/images', '/settings', '/admin']);

  const toggleExpand = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(h => h !== href)
        : [...prev, href]
    );
  };

  const isSubItemActive = (item: NavItem) => {
    if (!item.subItems) return false;
    return item.subItems.some(sub => pathname === sub.href);
  };

  const handleLinkClick = () => {
    // 모바일에서 링크 클릭 시 사이드바 닫기
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    if (onClose) onClose();
  };

  // Helper function to render nav items with sub-items
  const renderNavItem = (item: NavItem, isBottomItem = false) => {
    const isActive = pathname === item.href || isSubItemActive(item);
    const isExpanded = expandedItems.includes(item.href);
    const hasSubItems = item.subItems && item.subItems.length > 0;

    return (
      <div key={item.href}>
        {hasSubItems ? (
          <button
            onClick={() => toggleExpand(item.href)}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            <span className="flex-1 text-left">{item.name}</span>
            {item.step && (
              <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${
                isActive ? 'bg-purple-500' : 'bg-slate-700'
              }`}>
                {item.step}
              </span>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={handleLinkClick}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            <span className="flex-1">{item.name}</span>
            {item.step && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isActive ? 'bg-purple-500' : 'bg-slate-700'
              }`}>
                {item.step}
              </span>
            )}
          </Link>
        )}

        {hasSubItems && isExpanded && (
          <div className="mt-1 ml-4 space-y-1">
            {item.subItems!.map((subItem) => {
              const isSubActive = pathname === subItem.href;
              return (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  onClick={handleLinkClick}
                  className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    isSubActive
                      ? 'bg-purple-500/50 text-white'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <span className="mr-2 text-base">{subItem.icon}</span>
                  <span>{subItem.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-slate-800 border-r border-slate-700
          min-h-[calc(100vh-56px)] flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          top-14 lg:top-0
        `}
      >
        {/* 모바일 헤더 */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-700">
          <span className="text-white font-semibold">메뉴</span>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 워크플로우 단계 */}
        <div className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              워크플로우
            </h3>
          </div>
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || isSubItemActive(item);
              const isExpanded = expandedItems.includes(item.href);
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <div key={item.href}>
                  {/* 메인 메뉴 아이템 */}
                  {hasSubItems ? (
                    <button
                      onClick={() => toggleExpand(item.href)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.step && (
                        <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${
                          isActive ? 'bg-purple-500' : 'bg-slate-700'
                        }`}>
                          {item.step}
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      <span className="flex-1">{item.name}</span>
                      {item.step && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-purple-500' : 'bg-slate-700'
                        }`}>
                          {item.step}
                        </span>
                      )}
                    </Link>
                  )}

                  {/* 서브 메뉴 */}
                  {hasSubItems && isExpanded && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.subItems!.map((subItem) => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={handleLinkClick}
                            className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                              isSubActive
                                ? 'bg-purple-500/50 text-white'
                                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                            }`}
                          >
                            <span className="mr-2 text-base">{subItem.icon}</span>
                            <span>{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* 관리자 메뉴 (관리자만 표시) */}
        {isAdmin && (
          <div className="border-t border-slate-700 py-4">
            <div className="px-4 mb-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                관리자
              </h3>
            </div>
            <nav className="space-y-1 px-2">
              {adminItems.map((item) => renderNavItem(item, true))}
            </nav>
          </div>
        )}

        {/* 하단 메뉴 */}
        <div className="border-t border-slate-700 py-4">
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              도구
            </h3>
          </div>
          <nav className="space-y-1 px-2">
            {bottomItems.map((item) => renderNavItem(item, true))}
          </nav>
        </div>

        {/* 사용자 정보 및 로그인/로그아웃 */}
        <div className="border-t border-slate-700 p-4">
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <span>🚪</span>
                <span>로그아웃</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={handleLinkClick}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <span>🔐</span>
              <span>로그인</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
