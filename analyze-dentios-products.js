const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('='.repeat(80));
  console.log('🔍 DENTIOS 제품 페이지 상세 분석');
  console.log('='.repeat(80));

  // 모든 제품 페이지 접속
  await page.goto('https://dentios.co.kr/category/%EB%AA%A8%EB%93%A0-%EC%A0%9C%ED%92%88/42/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(3000);

  // 스크린샷
  await page.screenshot({ path: 'dentios-products.png', fullPage: true });
  console.log('\n📸 제품 목록 스크린샷 저장: dentios-products.png');

  // 제품 정보 수집
  console.log('\n' + '='.repeat(80));
  console.log('🛒 제품 목록 분석');
  console.log('='.repeat(80));

  const products = await page.$$eval('.prdList li, .product-list li, [class*="product"] li, .xans-product li', items => {
    return items.map(item => {
      const name = item.querySelector('.name a, .prd-name, [class*="name"]')?.textContent?.trim() || '';
      const price = item.querySelector('.price, .prd-price, [class*="price"]')?.textContent?.trim() || '';
      const img = item.querySelector('img')?.src || '';
      const link = item.querySelector('a')?.href || '';
      return { name, price, img, link };
    }).filter(p => p.name);
  }).catch(() => []);

  console.log(`\n총 ${products.length}개 제품 발견:\n`);
  products.forEach((product, i) => {
    console.log(`${i + 1}. ${product.name}`);
    console.log(`   가격: ${product.price}`);
    console.log(`   링크: ${product.link}\n`);
  });

  // 첫 번째 제품 상세 페이지 분석
  if (products.length > 0 && products[0].link) {
    console.log('\n' + '='.repeat(80));
    console.log('📦 제품 상세 페이지 분석');
    console.log('='.repeat(80));

    await page.goto(products[0].link, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'dentios-product-detail.png', fullPage: true });
    console.log('\n📸 제품 상세 스크린샷 저장: dentios-product-detail.png');

    // 제품 상세 정보
    const productDetail = await page.evaluate(() => {
      const name = document.querySelector('h2, .product-name, [class*="product"] h1, [class*="product"] h2')?.textContent?.trim() || '';
      const price = document.querySelector('.price, [class*="price"]')?.textContent?.trim() || '';
      const description = document.querySelector('.description, [class*="desc"], .product-desc')?.textContent?.trim() || '';

      // 제품 옵션
      const options = Array.from(document.querySelectorAll('select option, [class*="option"]')).map(opt => opt.textContent?.trim()).filter(Boolean);

      // 배송 정보
      const shipping = document.querySelector('[class*="shipping"], [class*="delivery"]')?.textContent?.trim() || '';

      return { name, price, description, options, shipping };
    });

    console.log(`\n제품명: ${productDetail.name}`);
    console.log(`가격: ${productDetail.price}`);
    console.log(`설명: ${productDetail.description?.substring(0, 200)}...`);
    if (productDetail.options.length > 0) {
      console.log(`옵션: ${productDetail.options.join(', ')}`);
    }
  }

  // 리뷰 페이지 분석
  console.log('\n' + '='.repeat(80));
  console.log('⭐ 리뷰 페이지 분석');
  console.log('='.repeat(80));

  await page.goto('https://dentios.co.kr/board/review/list_photo.html?board_no=4', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'dentios-reviews.png', fullPage: true });
  console.log('\n📸 리뷰 페이지 스크린샷 저장: dentios-reviews.png');

  const reviews = await page.$$eval('.board-list li, .review-list li, [class*="review"] li, .xans-board li', items => {
    return items.slice(0, 5).map(item => {
      const title = item.querySelector('.title, [class*="title"], a')?.textContent?.trim() || '';
      const date = item.querySelector('.date, [class*="date"]')?.textContent?.trim() || '';
      return { title, date };
    }).filter(r => r.title);
  }).catch(() => []);

  console.log(`\n최근 리뷰 ${reviews.length}개:`);
  reviews.forEach((review, i) => {
    console.log(`  ${i + 1}. ${review.title} (${review.date})`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ 제품 분석 완료!');
  console.log('='.repeat(80));

  await page.waitForTimeout(3000);
  await browser.close();
})();
