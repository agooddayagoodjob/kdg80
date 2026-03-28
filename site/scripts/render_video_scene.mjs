import fs from 'node:fs/promises';
import os from 'node:os';
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
const args = process.argv.slice(2);
const sceneArg = args.find((value) => !value.startsWith('--'));
const shouldBuild = args.includes('--build');
const fpsArg = args.find((value) => value.startsWith('--fps='));
const fps = Number(fpsArg?.split('=')[1] ?? '30');

if (!sceneArg) {
  throw new Error('Usage: node scripts/render_video_scene.mjs <scene-slug> [--fps=30] [--build]');
}

if (!Number.isFinite(fps) || fps < 12 || fps > 60) {
  throw new Error(`Unsupported fps value: ${fps}`);
}

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

function startPreviewServer() {
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

  const child = startPreviewServer();
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

async function flushAnimationFrame(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      }),
  );
}

async function renderSceneVideo(browser, slug) {
  const sceneDir = path.join(outputRoot, slug);
  await ensureDir(sceneDir);

  const frameDir = await fs.mkdtemp(path.join(os.tmpdir(), `video-preview-${slug}-`));
  const outputPath = path.join(sceneDir, `${slug}-render-${fps}fps.mp4`);

  const page = await browser.newPage({
    viewport: { width: 2460, height: 1400 },
    deviceScaleFactor: 1,
  });

  try {
    await page.goto(`${baseUrl}/video-preview/${slug}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-capture-root]');
    await page.waitForFunction(() => typeof window.__videoPreview?.seek === 'function');

    const sceneDurationMs = await page.evaluate(() => window.__videoPreview?.durationMs ?? 5600);
    const totalFrames = Math.max(2, Math.ceil((sceneDurationMs / 1000) * fps));
    const captureRoot = page.locator('[data-capture-root]');

    for (let index = 0; index < totalFrames; index += 1) {
      const ms = Math.min(sceneDurationMs - 1, Math.round((index * 1000) / fps));
      const framePath = path.join(frameDir, `frame-${String(index).padStart(5, '0')}.png`);

      await page.evaluate((timeMs) => window.__videoPreview?.seek?.(timeMs), ms);
      await flushAnimationFrame(page);
      await captureRoot.screenshot({ path: framePath, animations: 'allow' });

      if (index % Math.max(1, Math.round(fps)) === 0) {
        console.log(`Rendered ${slug}: ${index + 1}/${totalFrames} frames`);
      }
    }

    await execFileAsync('ffmpeg', [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      path.join(frameDir, 'frame-%05d.png'),
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '17',
      '-movflags',
      '+faststart',
      '-pix_fmt',
      'yuv420p',
      outputPath,
    ]);

    console.log(`Saved rendered video to ${outputPath}`);
  } finally {
    await page.close();
    await fs.rm(frameDir, { recursive: true, force: true });
  }
}

await ensureBuiltPreview();
const previewServer = await ensurePreviewServer();

try {
  await waitForServer(`${baseUrl}/video-preview/`);
  await ensureDir(outputRoot);

  const browser = await chromium.launch();

  try {
    await renderSceneVideo(browser, sceneArg);
  } finally {
    await browser.close();
  }
} finally {
  previewServer?.kill('SIGTERM');
}
