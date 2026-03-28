import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(siteRoot, '..');
const distRoot = path.join(siteRoot, 'dist');
const outputRoot = path.join(workspaceRoot, 'test-results', 'video-preview-20260327');
const baseUrl = 'http://127.0.0.1:4321';
const sceneArg = process.argv.find((value) => !value.startsWith('--') && value !== process.argv[1] && value !== process.argv[0]);
const captureAll = process.argv.includes('--all') || !sceneArg;
const shouldBuild = process.argv.includes('--build');
const captureRatios = [0, 0.12, 0.21, 0.32, 0.43, 0.57, 0.68, 0.8, 0.93];
const reviewFrameIndexes = [1, 3, 5, 6];
const representativeStillRatio = 0.43;

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
      // Server is still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`Timed out waiting for preview server: ${url}`);
}

async function isServerReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function startDevServer() {
  const child = spawn('python3', ['-m', 'http.server', '4321'], {
    cwd: distRoot,
    stdio: 'pipe',
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return child;
}

async function ensurePreviewServer() {
  const previewIndexUrl = `${baseUrl}/video-preview/`;

  if (await isServerReachable(previewIndexUrl)) {
    return null;
  }

  const child = startDevServer();
  await waitForServer(previewIndexUrl);
  return child;
}

async function ensureBuiltPreview() {
  if (shouldBuild) {
    const build = spawn('npm', ['run', 'build'], {
      cwd: siteRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        PUBLIC_SITE_ORIGIN: baseUrl,
      },
    });

    await new Promise((resolve, reject) => {
      build.on('exit', (code) => {
        if (code === 0) {
          resolve(undefined);
          return;
        }
        reject(new Error(`Build failed with exit code ${code}`));
      });
      build.on('error', reject);
    });
  }

  await fs.access(path.join(distRoot, 'video-preview', 'index.html'));
}

async function buildAnimatic(sceneDir, frames) {
  const contactPath = path.join(sceneDir, 'contact-sheet.webp');
  const animaticPath = path.join(sceneDir, 'animatic.gif');
  const contactFrames = reviewFrameIndexes
    .map((index) => frames[index])
    .filter(Boolean)
    .map((frame) => frame.path);

  await execFileAsync('montage', [
    ...contactFrames,
    '-tile',
    '2x2',
    '-geometry',
    '960x540+18+18',
    '-background',
    '#141111',
    contactPath,
  ]);

  const animaticArgs = [];
  for (const frame of frames) {
    animaticArgs.push('-delay', String(Math.max(8, Math.round(frame.delayMs / 10))), frame.path);
  }
  animaticArgs.push('-loop', '0', '-layers', 'Optimize', animaticPath);

  await execFileAsync('convert', animaticArgs);
}

async function readSceneLinks() {
  const response = await fetch(`${baseUrl}/video-preview/`);
  const html = await response.text();
  const matches = [...html.matchAll(/\/video-preview\/([^/]+)\//g)];
  return [...new Set(matches.map((match) => match[1]).filter(Boolean))];
}

async function captureScene(browser, slug) {
  const sceneDir = path.join(outputRoot, slug);
  await fs.rm(sceneDir, { recursive: true, force: true });
  await ensureDir(sceneDir);

  const page = await browser.newPage({
    viewport: { width: 2460, height: 1400 },
    deviceScaleFactor: 1,
  });

  await page.goto(`${baseUrl}/video-preview/${slug}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-capture-root]');
  await page.waitForFunction(() => typeof window.__videoPreview?.restart === 'function');
  const sceneDurationMs = await page.evaluate(() => window.__videoPreview?.durationMs ?? 5600);
  const timestamps = [...new Set(captureRatios.map((ratio) => Math.round(sceneDurationMs * ratio)))];
  const representativeStillMs = timestamps.reduce((closest, value) => {
    const target = sceneDurationMs * representativeStillRatio;
    return Math.abs(value - target) < Math.abs(closest - target) ? value : closest;
  }, timestamps[0] ?? 0);

  await page.evaluate(() => window.__videoPreview?.restart?.());

  const captureRoot = page.locator('[data-capture-root]');
  const frames = [];
  let lastTimestamp = 0;

  for (const ms of timestamps) {
    const waitMs = Math.max(0, ms - lastTimestamp);
    if (waitMs > 0) {
      await page.waitForTimeout(waitMs);
    }
    const framePath = path.join(sceneDir, `frame-${String(ms).padStart(4, '0')}.png`);
    await captureRoot.screenshot({ path: framePath, animations: 'allow' });
    const delayMs = ms === 0 ? 320 : Math.max(160, waitMs);
    frames.push({ path: framePath, ms, delayMs });
    lastTimestamp = ms;
  }

  const stillFrame = frames.find((frame) => frame.ms === representativeStillMs) ?? frames.at(-1);
  if (stillFrame) {
    const stillPath = path.join(sceneDir, 'still-desktop.png');
    await fs.copyFile(stillFrame.path, stillPath);
  }

  await buildAnimatic(sceneDir, frames);
  await page.close();
}

await ensureBuiltPreview();
const devServer = await ensurePreviewServer();

try {
  await waitForServer(`${baseUrl}/video-preview/`);
  await ensureDir(outputRoot);

  const sceneSlugs = captureAll ? await readSceneLinks() : [sceneArg];
  const browser = await chromium.launch();

  try {
    for (const slug of sceneSlugs) {
      console.log(`Capturing ${slug}...`);
      await captureScene(browser, slug);
    }
  } finally {
    await browser.close();
  }

  console.log(`Saved video preview captures to ${outputRoot}`);
} finally {
  devServer?.kill('SIGTERM');
}
