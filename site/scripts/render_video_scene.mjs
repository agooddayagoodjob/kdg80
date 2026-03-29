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
const args = process.argv.slice(2);
const port = Number(process.env.VIDEO_PREVIEW_PORT ?? '4326');
const baseUrl = `http://127.0.0.1:${port}`;
const sceneArg = args.find((value) => !value.startsWith('--'));
const shouldBuild = args.includes('--build');
const qualityArg = args.find((value) => value.startsWith('--quality='));
const profileArg = args.find((value) => value.startsWith('--profile='));
const fpsArg = args.find((value) => value.startsWith('--fps='));
const fromArg = args.find((value) => value.startsWith('--from-ms='));
const toArg = args.find((value) => value.startsWith('--to-ms='));
const supersampleArg = args.find((value) => value.startsWith('--supersample='));
const quality = qualityArg?.split('=')[1] ?? 'low';
const profile = profileArg?.split('=')[1] ?? 'playback-safe';
const defaultFps = quality === 'high'
  ? profile === 'master' ? '60' : '30'
  : '30';
const fps = Number(fpsArg?.split('=')[1] ?? defaultFps);
const clipFromMs = fromArg ? Number(fromArg.split('=')[1]) : 0;
const clipToMs = toArg ? Number(toArg.split('=')[1]) : undefined;
const supersample = Number(supersampleArg?.split('=')[1] ?? (quality === 'high' ? '2' : '1'));

if (!['low', 'high'].includes(quality)) {
  throw new Error(`Unsupported quality value: ${quality}`);
}

if (!['playback-safe', 'master'].includes(profile)) {
  throw new Error(`Unsupported profile value: ${profile}`);
}

if (!sceneArg) {
  throw new Error('Usage: node scripts/render_video_scene.mjs <scene-slug> [--build] [--quality=low|high] [--profile=playback-safe|master] [--fps=30|60] [--supersample=1|2|3] [--from-ms=0] [--to-ms=4000]');
}

if (!Number.isFinite(fps) || fps < 12 || fps > 60) {
  throw new Error(`Unsupported fps value: ${fps}`);
}

if (!Number.isFinite(supersample) || supersample < 1 || supersample > 3) {
  throw new Error(`Unsupported supersample value: ${supersample}`);
}

if (!Number.isFinite(clipFromMs) || clipFromMs < 0) {
  throw new Error(`Unsupported from-ms value: ${clipFromMs}`);
}

if (clipToMs !== undefined && (!Number.isFinite(clipToMs) || clipToMs <= clipFromMs)) {
  throw new Error(`Unsupported to-ms value: ${clipToMs}`);
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
  const child = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: distRoot,
    stdio: 'pipe',
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return child;
}

function getEncodeSettings() {
  if (profile === 'master') {
    return {
      h264Profile: 'high',
      level: '4.1',
      preset: quality === 'high' ? 'slow' : 'medium',
      crf: quality === 'high' ? '15' : '18',
      maxrate: quality === 'high' ? '14M' : '10M',
      bufsize: quality === 'high' ? '28M' : '20M',
    };
  }

  return {
    h264Profile: 'main',
    level: '4.0',
    preset: quality === 'high' ? 'slow' : 'medium',
    crf: quality === 'high' ? '16' : '19',
    maxrate: quality === 'high' ? '8M' : '6M',
    bufsize: quality === 'high' ? '16M' : '12M',
  };
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
  const clipSuffix = clipToMs !== undefined || clipFromMs > 0
    ? `-${String(clipFromMs).padStart(4, '0')}-${String(clipToMs ?? 0).padStart(4, '0')}`
    : '';
  const outputPath = path.join(sceneDir, `${slug}-${profile}-${quality}${clipSuffix}-render-${fps}fps.mp4`);
  const encodeSettings = getEncodeSettings();

  const page = await browser.newPage({
    viewport: { width: 2460, height: 1400 },
    deviceScaleFactor: supersample,
  });

  try {
    await page.goto(`${baseUrl}/video-preview/${slug}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-capture-root]');
    await page.waitForFunction(() => typeof window.__videoPreview?.seek === 'function');

    const sceneDurationMs = await page.evaluate(() => window.__videoPreview?.durationMs ?? 5600);
    const renderStartMs = Math.min(sceneDurationMs - 1, clipFromMs);
    const renderEndMs = clipToMs === undefined ? sceneDurationMs : Math.min(sceneDurationMs, clipToMs);
    const renderDurationMs = Math.max(100, renderEndMs - renderStartMs);
    const totalFrames = Math.max(2, Math.ceil((renderDurationMs / 1000) * fps));
    const captureRoot = page.locator('[data-capture-root]');

    for (let index = 0; index < totalFrames; index += 1) {
      const ms = Math.min(renderEndMs - 1, renderStartMs + Math.round((index * 1000) / fps));
      const framePath = path.join(frameDir, `frame-${String(index).padStart(5, '0')}.png`);

      await page.evaluate((timeMs) => window.__videoPreview?.seek?.(timeMs), ms);
      await flushAnimationFrame(page);
      await captureRoot.screenshot({ path: framePath, animations: 'allow' });

      if (index % Math.max(1, Math.round(fps / 2)) === 0) {
        console.log(`Rendered ${slug}: ${index + 1}/${totalFrames} frames`);
      }
    }

    await execFileAsync('ffmpeg', [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      path.join(frameDir, 'frame-%05d.png'),
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-shortest',
      '-vf',
      'scale=1920:1080:flags=lanczos,format=yuv420p',
      '-c:v',
      'libx264',
      '-profile:v',
      encodeSettings.h264Profile,
      '-level',
      encodeSettings.level,
      '-preset',
      encodeSettings.preset,
      '-crf',
      encodeSettings.crf,
      '-maxrate',
      encodeSettings.maxrate,
      '-bufsize',
      encodeSettings.bufsize,
      '-g',
      String(Math.max(30, fps * 2)),
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
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
