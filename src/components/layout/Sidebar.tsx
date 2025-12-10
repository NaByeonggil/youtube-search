'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

// TODO: 추후 구현 필요
// { name: '음성 합성', href: '/tts', icon: '🎙️', step: 7 }
// { name: '업로드', href: '/upload', icon: '📤', step: 9 }

const bottomItems: NavItem[] = [
  { name: '설정', href: '/settings', icon: '⚙️' },
];

// TODO: 추후 구현 필요
// { name: 'A/B 테스트', href: '/ab-tests', icon: '🧪' }
// { name: '성과 분석', href: '/analytics', icon: '📈' }

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['/analysis', '/scripts', '/images']);

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

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 min-h-[calc(100vh-56px)] flex flex-col">
      {/* 워크플로우 단계 */}
      <div className="flex-1 py-4">
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

      {/* 하단 메뉴 */}
      <div className="border-t border-slate-700 py-4">
        <div className="px-4 mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            도구
          </h3>
        </div>
        <nav className="space-y-1 px-2">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
