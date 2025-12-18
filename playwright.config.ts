import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 반응형 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // 데스크탑 브라우저 (반응형 테스트 - viewport 변경 가능)
    {
      name: 'Desktop Chrome',
      testMatch: /menu-responsive\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Desktop Firefox',
      testMatch: /menu-responsive\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // 태블릿 (반응형 테스트)
    {
      name: 'Tablet',
      testMatch: /menu-responsive\.spec\.ts/,
      use: {
        viewport: { width: 768, height: 1024 },
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    },

    // 모바일 디바이스 (모바일 전용 테스트 - Chromium 에뮬레이션)
    {
      name: 'Mobile iPhone',
      testMatch: /menu-mobile\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium', // Chromium으로 에뮬레이션
      },
    },
    {
      name: 'Mobile Galaxy',
      testMatch: /menu-mobile\.spec\.ts/,
      use: {
        ...devices['Galaxy S9+'],
        browserName: 'chromium', // Chromium으로 에뮬레이션
      },
    },
  ],

  // 로컬 개발 서버 자동 시작
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
