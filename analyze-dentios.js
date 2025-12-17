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
  console.log('🔍 DENTIOS 사이트 분석 시작');
  console.log('='.repeat(80));

  // 메인 페이지 접속
  await page.goto('https://dentios.co.kr/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // 스크린샷 저장
  await page.screenshot({ path: 'dentios-main.png', fullPage: true });
  console.log('\n📸 메인 페이지 스크린샷 저장: dentios-main.png');

  // 1. 기본 정보 수집
  console.log('\n' + '='.repeat(80));
  console.log('📋 1. 기본 사이트 정보');
  console.log('='.repeat(80));

  const title = await page.title();
  console.log(`📌 페이지 제목: ${title}`);

  const metaDescription = await page.$eval('meta[name="description"]', el => el.content).catch(() => '없음');
  console.log(`📌 메타 설명: ${metaDescription}`);

  // 2. 네비게이션/메뉴 구조 분석
  console.log('\n' + '='.repeat(80));
  console.log('🧭 2. 네비게이션 메뉴 구조');
  console.log('='.repeat(80));

  const navItems = await page.$$eval('nav a, header a, .nav a, .menu a, .gnb a, .lnb a', links => {
    return [...new Set(links.map(a => ({
      text: a.textContent?.trim(),
      href: a.href
    })).filter(item => item.text && item.text.length > 0))];
  }).catch(() => []);

  navItems.forEach((item, i) => {
    if (item.text && item.text.length < 50) {
      console.log(`  ${i + 1}. ${item.text} → ${item.href}`);
    }
  });

  // 3. 주요 섹션/콘텐츠 분석
  console.log('\n' + '='.repeat(80));
  console.log('📦 3. 주요 섹션 및 콘텐츠');
  console.log('='.repeat(80));

  const headings = await page.$$eval('h1, h2, h3', elements => {
    return elements.map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim()
    })).filter(item => item.text && item.text.length > 0 && item.text.length < 100);
  }).catch(() => []);

  headings.forEach(h => {
    console.log(`  [${h.tag}] ${h.text}`);
  });

  // 4. CTA(Call to Action) 버튼 분석
  console.log('\n' + '='.repeat(80));
  console.log('🎯 4. CTA 버튼 및 주요 액션');
  console.log('='.repeat(80));

  const buttons = await page.$$eval('button, .btn, [class*="button"], a[class*="btn"]', elements => {
    return elements.map(el => el.textContent?.trim())
      .filter(text => text && text.length > 0 && text.length < 50);
  }).catch(() => []);

  [...new Set(buttons)].forEach((btn, i) => {
    console.log(`  ${i + 1}. ${btn}`);
  });

  // 5. 서비스/제품 관련 키워드 추출
  console.log('\n' + '='.repeat(80));
  console.log('💼 5. 서비스/제품 키워드');
  console.log('='.repeat(80));

  const bodyText = await page.$eval('body', el => el.innerText).catch(() => '');

  // 치과/의료 관련 키워드 찾기
  const keywords = [
    '임플란트', '교정', '치아', '진료', '상담', '예약', '치과', '스케일링',
    '미백', '충치', '잇몸', '신경치료', '발치', '보철', '틀니', 'AI', '인공지능',
    'CRM', '마케팅', '광고', '환자', '병원', '의원', '솔루션', '플랫폼'
  ];

  const foundKeywords = keywords.filter(kw => bodyText.includes(kw));
  console.log(`  발견된 키워드: ${foundKeywords.join(', ')}`);

  // 6. 연락처/문의 정보
  console.log('\n' + '='.repeat(80));
  console.log('📞 6. 연락처 및 문의 정보');
  console.log('='.repeat(80));

  const phonePattern = /\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  const phones = bodyText.match(phonePattern) || [];
  const emails = bodyText.match(emailPattern) || [];

  console.log(`  전화번호: ${[...new Set(phones)].join(', ') || '없음'}`);
  console.log(`  이메일: ${[...new Set(emails)].join(', ') || '없음'}`);

  // 7. 폼/입력 필드 분석
  console.log('\n' + '='.repeat(80));
  console.log('📝 7. 폼 및 입력 필드');
  console.log('='.repeat(80));

  const forms = await page.$$eval('form', forms => {
    return forms.map(form => {
      const inputs = form.querySelectorAll('input, textarea, select');
      return {
        action: form.action,
        inputCount: inputs.length,
        inputs: Array.from(inputs).map(inp => ({
          type: inp.type || inp.tagName.toLowerCase(),
          name: inp.name || inp.placeholder || ''
        }))
      };
    });
  }).catch(() => []);

  forms.forEach((form, i) => {
    console.log(`  폼 ${i + 1}: ${form.inputCount}개 입력 필드`);
    form.inputs.forEach(inp => {
      console.log(`    - [${inp.type}] ${inp.name}`);
    });
  });

  // 8. 이미지 및 미디어 분석
  console.log('\n' + '='.repeat(80));
  console.log('🖼️ 8. 이미지 및 미디어');
  console.log('='.repeat(80));

  const images = await page.$$eval('img', imgs => {
    return imgs.map(img => ({
      src: img.src,
      alt: img.alt
    })).filter(img => img.alt && img.alt.length > 0);
  }).catch(() => []);

  console.log(`  총 이미지 수: ${images.length}개`);
  images.slice(0, 10).forEach(img => {
    console.log(`    - ${img.alt}`);
  });

  // 9. 소셜 미디어 링크
  console.log('\n' + '='.repeat(80));
  console.log('🌐 9. 소셜 미디어 및 외부 링크');
  console.log('='.repeat(80));

  const socialLinks = await page.$$eval('a[href*="facebook"], a[href*="instagram"], a[href*="youtube"], a[href*="twitter"], a[href*="blog.naver"], a[href*="kakao"]', links => {
    return links.map(a => a.href);
  }).catch(() => []);

  if (socialLinks.length > 0) {
    socialLinks.forEach(link => console.log(`  - ${link}`));
  } else {
    console.log('  소셜 미디어 링크 없음');
  }

  // 10. 페이지 스크롤하며 추가 콘텐츠 수집
  console.log('\n' + '='.repeat(80));
  console.log('📜 10. 스크롤 탐색 중...');
  console.log('='.repeat(80));

  // 페이지 끝까지 스크롤
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });

  await page.waitForTimeout(2000);

  // 스크롤 후 추가 콘텐츠 확인
  const additionalSections = await page.$$eval('section, .section, [class*="section"]', sections => {
    return sections.map(s => {
      const heading = s.querySelector('h1, h2, h3');
      return heading ? heading.textContent?.trim() : null;
    }).filter(Boolean);
  }).catch(() => []);

  console.log('  발견된 섹션들:');
  [...new Set(additionalSections)].forEach(section => {
    console.log(`    - ${section}`);
  });

  // 최종 스크린샷
  await page.screenshot({ path: 'dentios-full.png', fullPage: true });
  console.log('\n📸 전체 페이지 스크린샷 저장: dentios-full.png');

  // 11. 하위 페이지 탐색
  console.log('\n' + '='.repeat(80));
  console.log('🔗 11. 주요 하위 페이지 탐색');
  console.log('='.repeat(80));

  const mainLinks = await page.$$eval('a[href^="https://dentios.co.kr"], a[href^="/"]', links => {
    return [...new Set(links.map(a => a.href))].filter(href =>
      !href.includes('#') &&
      !href.includes('javascript') &&
      href.startsWith('https://dentios.co.kr')
    ).slice(0, 10);
  }).catch(() => []);

  for (const link of mainLinks.slice(0, 5)) {
    try {
      console.log(`\n  📄 탐색 중: ${link}`);
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      const pageTitle = await page.title();
      const pageHeadings = await page.$$eval('h1, h2', els =>
        els.slice(0, 3).map(el => el.textContent?.trim()).filter(Boolean)
      ).catch(() => []);

      console.log(`     제목: ${pageTitle}`);
      console.log(`     주요 내용: ${pageHeadings.join(' | ')}`);
    } catch (e) {
      console.log(`     접근 실패`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 분석 완료!');
  console.log('='.repeat(80));

  await page.waitForTimeout(3000);
  await browser.close();
})();
