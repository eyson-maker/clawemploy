import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent('<h1>Hello Puppeteer</h1>');
  await page.screenshot({ path: 'test-screenshot.png' });
  await browser.close();
  console.log('Puppeteer works!');
})();
