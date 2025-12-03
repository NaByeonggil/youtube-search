'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  step?: number;
}

const navItems: NavItem[] = [
  { name: '대시보드', href: '/', icon: '🏠' },
  { name: '키워드 검색', href: '/search', icon: '🔍', step: 1 },
  { name: '영상 분석', href: '/projects', icon: '📊', step: 2 },
  { name: '댓글 분석', href: '/analysis', icon: '💬', step: 3 },
  { name: '대본 생성', href: '/scripts', icon: '📝', step: 4 },
  { name: '캐릭터 설정', href: '/characters', icon: '👤', step: 5 },
  { name: '이미지 생성', href: '/images', icon: '🎨', step: 6 },
  // { name: '음성 합성', href: '/tts', icon: '🎙️', step: 7 },  // TODO: 페이지 구현 필요
  { name: 'AI 영상 생성', href: '/videos', icon: '🎬', step: 8 },
  // { name: '업로드', href: '/upload', icon: '📤', step: 9 },  // TODO: 페이지 구현 필요
];

const bottomItems: NavItem[] = [
  // { name: 'A/B 테스트', href: '/ab-tests', icon: '🧪' },  // TODO: 페이지 구현 필요
  // { name: '성과 분석', href: '/analytics', icon: '📈' },  // TODO: 페이지 구현 필요
  { name: '설정', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

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
                <span className="flex-1">{item.name}</span>
                {item.step && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-purple-500' : 'bg-slate-700'
                  }`}>
                    {item.step}
                  </span>
                )}
              </Link>
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
