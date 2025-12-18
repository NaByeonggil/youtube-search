import { test, expect, Page } from '@playwright/test';

/**
 * 메뉴 반응형 테스트
 *
 * 테스트 대상:
 * - Header: 햄버거 메뉴, 로고, 포맷 선택
 * - Sidebar: 네비게이션, 서브메뉴, 오버레이
 *
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px (lg)
 */

// 반응형 breakpoints
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

test.describe('Header 반응형 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('모바일: 햄버거 메뉴 버튼 표시', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // 햄버거 메뉴 버튼이 보여야 함
    const hamburgerButton = page.locator('button[aria-label="메뉴 토글"]');
    await expect(hamburgerButton).toBeVisible();
  });

  test('데스크탑: 햄버거 메뉴 버튼 숨김', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // 햄버거 메뉴 버튼이 숨겨져야 함
    const hamburgerButton = page.locator('button[aria-label="메뉴 토글"]');
    await expect(hamburgerButton).toBeHidden();
  });

  test('모바일: 로고 텍스트 축약 표시', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // 축약된 로고 "나약사" 표시 (sm:hidden 클래스를 가진 span)
    const shortLogo = page.locator('header span.sm\\:hidden:has-text("나약사")');
    await expect(shortLogo).toBeVisible();
  });

  test('태블릿+: 전체 로고 텍스트 표시', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);

    // 전체 로고 "나약사 유튜브 검색기" 표시
    const fullLogo = page.locator('text=나약사 유튜브 검색기');
    await expect(fullLogo).toBeVisible();
  });

  test('모바일: 포맷 선택 컴팩트 버전', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // 모바일용 컴팩트 포맷 선택 버튼
    const compactFormatButton = page.locator('.md\\:hidden button:has-text("롱폼")');
    await expect(compactFormatButton).toBeVisible();
  });

  test('태블릿+: 포맷 선택 전체 버전', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);

    // 데스크탑용 포맷 선택
    const desktopFormat = page.locator('.hidden.md\\:flex');
    await expect(desktopFormat).toBeVisible();
  });
});

test.describe('Sidebar 반응형 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('데스크탑: 사이드바 항상 표시', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // 사이드바가 보여야 함
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // 워크플로우 메뉴 표시 확인 (aside 내 h3 요소)
    await expect(page.locator('aside h3:has-text("워크플로우")')).toBeVisible();
    await expect(page.locator('aside >> text=대시보드')).toBeVisible();
  });

  test('모바일: 초기 사이드바 숨김', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // 사이드바가 화면 밖으로 이동 (translate-x-full)
    const sidebar = page.locator('aside');
    // 모바일에서는 transform으로 숨겨지므로 bounding box 확인
    const box = await sidebar.boundingBox();
    expect(box?.x).toBeLessThan(0); // 왼쪽 화면 밖
  });

  test('모바일: 햄버거 클릭 시 사이드바 열기', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // 햄버거 버튼 클릭
    const hamburgerButton = page.locator('button[aria-label="메뉴 토글"]');
    await hamburgerButton.click();

    // 사이드바 표시 확인
    await expect(page.locator('aside')).toBeVisible();

    // 오버레이 표시 확인
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
    await expect(overlay).toBeVisible();
  });

  test('모바일: 오버레이 클릭 시 사이드바 닫기', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // 사이드바 열기
    await page.locator('button[aria-label="메뉴 토글"]').click();
    await expect(page.locator('aside')).toBeVisible();

    // 오버레이 클릭 (사이드바 영역 외부 클릭 - force 사용)
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
    await overlay.click({ position: { x: 350, y: 300 }, force: true });

    // 사이드바 닫힘 확인 (transform으로 이동)
    await page.waitForTimeout(400); // transition 대기
    const sidebar = page.locator('aside');
    const box = await sidebar.boundingBox();
    expect(box?.x).toBeLessThan(0);
  });

  test('모바일: 사이드바 닫기 버튼', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // 사이드바 열기
    await page.locator('button[aria-label="메뉴 토글"]').click();

    // 모바일 헤더 "메뉴" 텍스트와 닫기 버튼 확인
    await expect(page.locator('aside >> text=메뉴')).toBeVisible();

    // 닫기 버튼 (aside 내부 X 버튼)
    const closeButton = page.locator('aside button').filter({ has: page.locator('svg') }).first();
    await closeButton.click();

    // 사이드바 닫힘 확인
    await page.waitForTimeout(400);
    const sidebar = page.locator('aside');
    const box = await sidebar.boundingBox();
    expect(box?.x).toBeLessThan(0);
  });
});

test.describe('메뉴 네비게이션 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('메인 메뉴 아이템 표시', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // 주요 메뉴 아이템 확인
    const menuItems = [
      '대시보드',
      '키워드 검색',
      '영상 분석',
      '댓글 분석',
      '대본 생성',
      '대본 구조 분석',
      '캐릭터 설정',
      '이미지 생성',
      '음성 합성',
      'AI 영상 생성',
      '업로드',
    ];

    for (const item of menuItems) {
      await expect(page.locator(`aside >> text=${item}`).first()).toBeVisible();
    }
  });

  test('서브메뉴 토글 동작', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // 키워드 검색 메뉴 클릭 (서브메뉴 있음)
    const searchMenu = page.locator('aside button:has-text("키워드 검색")');

    // 서브메뉴 아이템 확인 (기본 확장됨)
    await expect(page.locator('aside >> text=검색하기')).toBeVisible();
    await expect(page.locator('aside >> text=콘텐츠 아이디어')).toBeVisible();

    // 토글하여 닫기
    await searchMenu.click();
    await page.waitForTimeout(100);

    // 서브메뉴 숨김 확인
    await expect(page.locator('aside >> text=검색하기')).toBeHidden();

    // 다시 열기
    await searchMenu.click();
    await expect(page.locator('aside >> text=검색하기')).toBeVisible();
  });

  test('메뉴 클릭 시 페이지 이동', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // 영상 분석 메뉴 클릭
    await page.locator('aside >> text=영상 분석').click();
    await expect(page).toHaveURL(/\/projects/);

    // 대시보드로 돌아가기
    await page.locator('aside >> text=대시보드').click();
    await expect(page).toHaveURL('/');
  });

  test('모바일: 메뉴 클릭 시 사이드바 자동 닫기', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // 사이드바 열기
    await page.locator('button[aria-label="메뉴 토글"]').click();
    await expect(page.locator('aside')).toBeVisible();

    // 메뉴 클릭
    await page.locator('aside >> text=영상 분석').click();

    // 페이지 이동 및 사이드바 닫힘 확인
    await expect(page).toHaveURL(/\/projects/);
    await page.waitForTimeout(400);

    const sidebar = page.locator('aside');
    const box = await sidebar.boundingBox();
    expect(box?.x).toBeLessThan(0);
  });
});

test.describe('반응형 breakpoint 전환 테스트', () => {
  test('viewport 크기 변경 시 레이아웃 적응', async ({ page }) => {
    await page.goto('/');

    // 데스크탑 시작 (1024px 이상)
    await page.setViewportSize(VIEWPORTS.desktop);
    await expect(page.locator('button[aria-label="메뉴 토글"]')).toBeHidden();

    // 태블릿으로 축소 (768px - lg breakpoint 미만이므로 햄버거 보임)
    await page.setViewportSize(VIEWPORTS.tablet);
    await expect(page.locator('button[aria-label="메뉴 토글"]')).toBeVisible();

    // 모바일로 축소 (lg breakpoint 이하)
    await page.setViewportSize(VIEWPORTS.mobile);
    await expect(page.locator('button[aria-label="메뉴 토글"]')).toBeVisible();

    // 다시 데스크탑으로
    await page.setViewportSize(VIEWPORTS.desktop);
    await expect(page.locator('button[aria-label="메뉴 토글"]')).toBeHidden();
  });

  test('lg breakpoint (1024px) 경계 테스트', async ({ page }) => {
    await page.goto('/');

    // lg breakpoint 미만 (1023px)
    await page.setViewportSize({ width: 1023, height: 768 });
    await expect(page.locator('button[aria-label="메뉴 토글"]')).toBeVisible();

    // lg breakpoint 이상 (1024px)
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator('button[aria-label="메뉴 토글"]')).toBeHidden();
  });
});

test.describe('스크린샷 비교 테스트', () => {
  test('각 breakpoint에서 메뉴 스크린샷', async ({ page }) => {
    await page.goto('/');

    // 모바일 스크린샷
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.screenshot({
      path: 'e2e/screenshots/menu-mobile.png',
      fullPage: false
    });

    // 모바일 사이드바 열린 상태
    await page.locator('button[aria-label="메뉴 토글"]').click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: 'e2e/screenshots/menu-mobile-open.png',
      fullPage: false
    });

    // 태블릿 스크린샷
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.screenshot({
      path: 'e2e/screenshots/menu-tablet.png',
      fullPage: false
    });

    // 데스크탑 스크린샷
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.screenshot({
      path: 'e2e/screenshots/menu-desktop.png',
      fullPage: false
    });
  });
});

test.describe('설정 및 도구 메뉴 테스트', () => {
  test('설정 메뉴 표시 및 서브메뉴', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize(VIEWPORTS.desktop);

    // 도구 섹션 확인 (h3 요소)
    await expect(page.locator('aside h3:has-text("도구")')).toBeVisible();

    // 설정 메뉴 확인 (버튼)
    await expect(page.getByRole('button', { name: /설정/ })).toBeVisible();

    // API 키 설정 서브메뉴
    await expect(page.getByRole('link', { name: /API 키 설정/ })).toBeVisible();
  });
});

test.describe('접근성 테스트', () => {
  test('키보드 네비게이션', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize(VIEWPORTS.desktop);

    // Tab 키로 메뉴 이동
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // 포커스된 요소 확인
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('모바일: ESC 키로 사이드바 닫기', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize(VIEWPORTS.mobile);

    // 사이드바 열기
    await page.locator('button[aria-label="메뉴 토글"]').click();
    await expect(page.locator('aside')).toBeVisible();

    // ESC 키 누르기
    await page.keyboard.press('Escape');

    // 사이드바 닫힘 확인
    await page.waitForTimeout(400);
    const sidebar = page.locator('aside');
    const box = await sidebar.boundingBox();
    expect(box?.x).toBeLessThan(0);
  });
});
