import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(siteRoot, '..');
const distRoot = path.join(siteRoot, 'dist');
const port = Number(process.env.VIDEO_STORY_PORT ?? '4327');
const baseUrl = `http://127.0.0.1:${port}`;
const outputRoot = path.join(workspaceRoot, 'test-results', 'video-story-20260405', '_captures');

const scenes = [
  'week-intro',
  'week-priroda-chemodana',
  'week-zoo-right',
  'week-nostalgia',
  'week-bridge',
  'week-site',
  'week-telegram',
  'week-max',
];

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // booting
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for story preview server: ${url}`);
}

function startPreviewServer() {
  const child = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: distRoot,
    stdio: 'pipe',
  });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return child;
}

async function seekScene(page, ms) {
  await page.waitForFunction(() => typeof window.__storyPreview?.seek === 'function');
  await page.evaluate((targetMs) => {
    window.__storyPreview.pause();
    window.__storyPreview.seek(targetMs);
  }, ms);
  await page.waitForTimeout(40);
}

async function captureScene(browser, slug) {
  const desktopPage = await browser.newPage({
    viewport: { width: 1520, height: 2300 },
    deviceScaleFactor: 1,
  });
  const mobilePage = await browser.newPage({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  try {
    await desktopPage.goto(`${baseUrl}/video-story/${slug}/`, { waitUntil: 'networkidle' });
    await seekScene(desktopPage, 2200);
    await desktopPage.locator('[data-capture-root]').screenshot({
      path: path.join(outputRoot, `${slug}-stage-desktop.png`),
      animations: 'allow',
    });
    await desktopPage.screenshot({
      path: path.join(outputRoot, `${slug}-shell-desktop.png`),
      fullPage: true,
      animations: 'allow',
    });

    await mobilePage.goto(`${baseUrl}/video-story/${slug}/`, { waitUntil: 'networkidle' });
    await seekScene(mobilePage, 2200);
    await mobilePage.screenshot({
      path: path.join(outputRoot, `${slug}-shell-mobile.png`),
      fullPage: true,
      animations: 'allow',
    });
  } finally {
    await desktopPage.close();
    await mobilePage.close();
  }
}

async function main() {
  await ensureDir(outputRoot);
  await fs.access(path.join(distRoot, 'video-story', 'index.html'));
  const previewServer = startPreviewServer();

  try {
    await waitForServer(`${baseUrl}/video-story/`);
    const browser = await chromium.launch();
    try {
      for (const slug of scenes) {
        console.log(`Capturing ${slug}`);
        await captureScene(browser, slug);
      }
    } finally {
      await browser.close();
    }
  } finally {
    previewServer.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
