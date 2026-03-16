import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const TITLES = [
  "Best AI Agents for Solopreneurs in 2026",
  "How to Automate SEO with AI Agents",
  "OpenClaw Automation Guide for Indie Developers",
  "OpenClaw vs. Manual Workflows: A Comparison",
  "Building a Scaling SaaS with AI Experts",
  "Maximizing Productivity: The AI Agent Way",
  "Unlocking Growth with Automated Workflows",
  "The New Era of Independent Development"
];

const STYLES = [
  { bg: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', text: '#ffffff' },
  { bg: 'linear-gradient(135deg, #111827 0%, #312e81 100%)', text: '#ffffff' },
  { bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', text: '#111827' },
  { bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', text: '#ffffff' },
  { bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', text: '#ffffff' },
  { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', text: '#166534' },
  { bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', text: '#6b21a8' },
  { bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', text: '#1e40af' }
];

async function generate() {
  const outputDir = '/Users/eyson/Documents/mksaas_clawemploy/public/images/blog/';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.CHROME_PATH || undefined
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 787 });

  for (let i = 0; i < TITLES.length; i++) {
    const title = TITLES[i];
    const style = STYLES[i % STYLES.length];
    const isDark = style.text === '#ffffff';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 1400px;
            height: 787px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: ${style.bg};
            color: ${style.text};
            overflow: hidden;
            position: relative;
          }
          .background-pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.1;
            background-image: radial-gradient(${style.text} 1px, transparent 1px);
            background-size: 30px 30px;
          }
          .logo {
            position: absolute;
            top: 60px;
            left: 80px;
            font-size: 32px;
            font-weight: 800;
            display: flex;
            align-items: center;
          }
          .logo span {
            color: ${isDark ? '#818cf8' : '#6366f1'};
          }
          .logo-text {
            color: ${style.text};
            margin-left: 2px;
          }
          .content {
            padding: 0 100px;
            text-align: center;
            z-index: 10;
          }
          h1 {
            font-size: 84px;
            line-height: 1.1;
            margin-bottom: 40px;
            font-weight: 800;
            letter-spacing: -0.02em;
            text-wrap: balance;
          }
          .slogan {
            font-size: 24px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            opacity: 0.8;
            position: absolute;
            bottom: 60px;
            width: 100%;
            text-align: center;
          }
          .card {
            background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'};
            backdrop-filter: blur(10px);
            border-radius: 40px;
            padding: 80px 60px;
            border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
            max-width: 1000px;
          }
        </style>
      </head>
      <body>
        <div class="background-pattern"></div>
        <div class="logo">
          <span>Claw</span><div class="logo-text">Employ</div>
        </div>
        <div class="content">
          <div class="card">
            <h1>${title}</h1>
          </div>
        </div>
        <div class="slogan">Hire AI Experts, Not Headcount</div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const fileName = `post-${i + 1}.png`;
    const filePath = path.join(outputDir, fileName);
    await page.screenshot({ path: filePath });
    console.log(`Generated ${fileName}`);
  }

  await browser.close();
}

generate().catch(console.error);
