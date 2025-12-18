import { test, expect } from '@playwright/test';

/**
 * 모바일 디바이스 전용 테스트
 *
 * 이 테스트는 Mobile iPhone, Mobile Galaxy 프로젝트에서 실행됩니다.
 * viewport를 변경하지 않고 디바이스 기본 설정을 사용합니다.
 */

test.describe('모바일 디바이스 메뉴 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('햄버거 메뉴 버튼 표시', async ({ page }) => {
    const hamburgerButton = page.locator('button[aria-label="메뉴 토글"]');
    await expect(hamburgerButton).toBeVisible();
  });

  test('사이드바 초기 숨김 상태', async ({ page }) => {
    const sidebar = page.locator('aside');
    const box = await sidebar.boundingBox();
    // 사이드바가 화면 왼쪽 밖에 위치
    expect(box?.x).toBeLessThan(0);
  });

  test('햄버거 클릭 시 사이드바 열기', async ({ page }) => {
    await page.locator('button[aria-label="메뉴 토글"]').click();

    // 사이드바 표시
    await expect(page.locator('aside')).toBeVisible();

    // 오버레이 표시
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
    await expect(overlay).toBeVisible();

    // 메뉴 텍스트 표시
    await expect(page.locator('aside >> text=메뉴')).toBeVisible();
  });

  test('사이드바에서 메뉴 네비게이션', async ({ page }) => {
    // 사이드바 열기
    await page.locator('button[aria-label="메뉴 토글"]').click();
    await expect(page.locator('aside')).toBeVisible();

    // 메뉴 아이템 클릭
    await page.locator('aside >> text=영상 분석').click();

    // 페이지 이동 확인
    await expect(page).toHaveURL(/\/projects/);

    // 사이드바 자동 닫힘
    await page.waitForTimeout(400);
    const sidebar = page.locator('aside');
    const box = await sidebar.boundingBox();
    expect(box?.x).toBeLessThan(0);
  });

  test('ESC 키로 사이드바 닫기', async ({ page }) => {
    // 사이드바 열기
    await page.locator('button[aria-label="메뉴 토글"]').click();
    await expect(page.locator('aside')).toBeVisible();

    // ESC 키
    await page.keyboard.press('Escape');

    // 사이드바 닫힘
    await page.waitForTimeout(400);
    const sidebar = page.locator('aside');
    const box = await sidebar.boundingBox();
    expect(box?.x).toBeLessThan(0);
  });

  test('서브메뉴 펼치기/접기', async ({ page }) => {
    // 사이드바 열기
    await page.locator('button[aria-label="메뉴 토글"]').click();

    // 키워드 검색 서브메뉴 확인 (기본 펼쳐짐)
    await expect(page.locator('aside >> text=검색하기')).toBeVisible();

    // 토글하여 접기
    await page.locator('aside button:has-text("키워드 검색")').click();
    await page.waitForTimeout(100);
    await expect(page.locator('aside >> text=검색하기')).toBeHidden();

    // 다시 펼치기
    await page.locator('aside button:has-text("키워드 검색")').click();
    await expect(page.locator('aside >> text=검색하기')).toBeVisible();
  });

  test('로고 축약 텍스트 표시', async ({ page }) => {
    // 모바일에서 축약된 로고
    const shortLogo = page.locator('header span.sm\\:hidden:has-text("나약사")');
    await expect(shortLogo).toBeVisible();
  });

  test('포맷 선택 컴팩트 버전', async ({ page }) => {
    const compactFormat = page.locator('.md\\:hidden button:has-text("롱폼")');
    await expect(compactFormat).toBeVisible();
  });

  test('스크린샷 캡처', async ({ page, browserName }) => {
    // 초기 상태
    await page.screenshot({
      path: `e2e/screenshots/mobile-${browserName}-closed.png`,
    });

    // 사이드바 열린 상태
    await page.locator('button[aria-label="메뉴 토글"]').click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `e2e/screenshots/mobile-${browserName}-open.png`,
    });
  });
});
