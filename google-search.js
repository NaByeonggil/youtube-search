const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // DuckDuckGo 사용 (구글 차단 우회)
  await page.goto('https://duckduckgo.com');

  // 검색어 입력
  await page.fill('input[name="q"]', '코드팩토리');

  // 검색 실행
  await page.keyboard.press('Enter');

  // 검색 결과 로딩 대기
  await page.waitForSelector('[data-testid="result"]', { timeout: 15000 });

  // 검색 결과 출력
  const results = await page.$$eval('[data-testid="result"]', (elements) => {
    return elements.slice(0, 5).map(el => {
      const title = el.querySelector('h2')?.textContent || '';
      const link = el.querySelector('a')?.href || '';
      const snippet = el.querySelector('[data-result="snippet"]')?.textContent || '';
      return { title, link, snippet };
    });
  });

  console.log('\n=== 코드팩토리 검색 결과 (DuckDuckGo) ===\n');
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.title}`);
    console.log(`   링크: ${result.link}`);
    console.log(`   설명: ${result.snippet}\n`);
  });

  // 5초 대기 후 브라우저 닫기
  await page.waitForTimeout(5000);
  await browser.close();
})();
