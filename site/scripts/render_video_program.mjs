import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import videoProgramConfig from '../src/data/video-preview-program.json' with { type: 'json' };

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(siteRoot, '..');
const distRoot = path.join(siteRoot, 'dist');
const args = process.argv.slice(2);
const port = Number(process.env.VIDEO_PREVIEW_PORT ?? '4326');
const baseUrl = `http://127.0.0.1:${port}`;
const qualityArg = args.find((value) => value.startsWith('--quality='));
const profileArg = args.find((value) => value.startsWith('--profile='));
const fpsArg = args.find((value) => value.startsWith('--fps='));
const supersampleArg = args.find((value) => value.startsWith('--supersample='));
const tagArg = args.find((value) => value.startsWith('--tag='));
const resume = args.includes('--resume');
const skipBuild = args.includes('--skip-build');
const quality = qualityArg?.split('=')[1] ?? 'low';
const profile = profileArg?.split('=')[1] ?? 'playback-safe';
const fps = Number(fpsArg?.split('=')[1] ?? '15');
const supersample = Number(supersampleArg?.split('=')[1] ?? '1');
const outputTag = (tagArg?.split('=')[1] ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/-{2,}/g, '-')
  .replace(/^-+|-+$/g, '');
const outputRoot = path.join(
  workspaceRoot,
  'test-results',
  'video-preview-20260327',
  outputTag ? `_program-cut-20260403-${outputTag}` : '_program-cut-20260403',
);
const clipRoot = path.join(outputRoot, 'clips');
const outputBaseName = `festival-program-cut-${profile}-${quality}-${fps}fps`;
const outputPath = path.join(outputRoot, `${outputBaseName}.mp4`);

const sceneSlugs = [
  'cold-open',
  ...videoProgramConfig.acts.flatMap((act) => [act.sceneSlug, ...act.sceneSlugs]),
  'telegram',
  'max',
];

if (!['low', 'high'].includes(quality)) {
  throw new Error(`Unsupported quality value: ${quality}`);
}

if (!['playback-safe', 'master'].includes(profile)) {
  throw new Error(`Unsupported profile value: ${profile}`);
}

if (!Number.isFinite(fps) || fps < 12 || fps > 60) {
  throw new Error(`Unsupported fps value: ${fps}`);
}

if (!Number.isFinite(supersample) || supersample < 1 || supersample > 3) {
  throw new Error(`Unsupported supersample value: ${supersample}`);
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

async function ensureBuiltPreview() {
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

  await fs.access(path.join(distRoot, 'video-preview', 'index.html'));
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

async function pauseAndSeek(page, timeMs) {
  await page.evaluate((targetMs) => {
    window.__videoPreview?.pause?.();
    window.__videoPreview?.seek?.(targetMs);
  }, timeMs);
}

async function loadScene(page, slug) {
  await page.goto(`${baseUrl}/video-preview/${slug}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-capture-root]');
  await page.waitForFunction(() => typeof window.__videoPreview?.seek === 'function');
  const durationMs = await page.evaluate(() => window.__videoPreview?.durationMs ?? 5600);
  return durationMs;
}

function getCaptureViewport() {
  return {
    width: 2460,
    height: 1400,
  };
}

async function createCapturePage(browser) {
  return browser.newPage({
    viewport: getCaptureViewport(),
    deviceScaleFactor: supersample,
  });
}

function isRecoverableCaptureError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Target page, context or browser has been closed') ||
    message.includes('Target crashed') ||
    message.includes('Page crashed') ||
    message.includes('Browser has been closed')
  );
}

async function renderSceneClip(slug, sceneDurationMs, index, totalScenes, totalFrames, progressState) {
  const totalSceneFrames = Math.max(2, Math.ceil((sceneDurationMs / 1000) * fps));
  const clipPath = getClipPath(slug, index);
  const tempClipPath = `${clipPath}.partial.mp4`;
  const encodeSettings = getEncodeSettings();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const frameDir = await fs.mkdtemp(path.join(os.tmpdir(), `video-preview-program-${slug}-`));
    let browser;
    let page;
    let renderedFramesThisAttempt = 0;

    try {
      browser = await chromium.launch();
      page = await createCapturePage(browser);
      await loadScene(page, slug);
      const captureRoot = page.locator('[data-capture-root]');
      const retrySuffix = attempt > 1 ? ` [retry ${attempt}/${maxAttempts}]` : '';
      console.log(
        `Rendering scene ${index + 1}/${totalScenes}: ${slug} (${totalSceneFrames} frames)${retrySuffix}`,
      );

      for (let frameIndex = 0; frameIndex < totalSceneFrames; frameIndex += 1) {
        const ms = Math.min(sceneDurationMs - 1, Math.round((frameIndex * 1000) / fps));
        const framePath = path.join(frameDir, `frame-${String(frameIndex).padStart(5, '0')}.png`);

        await pauseAndSeek(page, ms);
        await flushAnimationFrame(page);
        await captureRoot.screenshot({ path: framePath, animations: 'allow' });

        renderedFramesThisAttempt += 1;
        progressState.renderedFrames += 1;
        const percent = Math.floor((progressState.renderedFrames / totalFrames) * 100);
        if (percent > progressState.lastPercentLogged) {
          progressState.lastPercentLogged = percent;
          console.log(`PROGRESS ${percent}%`);
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
        tempClipPath,
      ]);

      await fs.rename(tempClipPath, clipPath);
      console.log(`Saved clip: ${clipPath}`);
      return clipPath;
    } catch (error) {
      progressState.renderedFrames = Math.max(0, progressState.renderedFrames - renderedFramesThisAttempt);

      if (attempt < maxAttempts && isRecoverableCaptureError(error)) {
        console.warn(`Retrying scene ${slug} after browser/page closure (${attempt}/${maxAttempts})`);
        continue;
      }

      throw error;
    } finally {
      await page?.close().catch(() => {});
      await browser?.close().catch(() => {});
      await fs.rm(frameDir, { recursive: true, force: true });
      await fs.rm(tempClipPath, { force: true });
    }
  }
}

function getClipPath(slug, index) {
  return path.join(clipRoot, `${String(index + 1).padStart(2, '0')}-${slug}.mp4`);
}

async function buildConcatVideo(clipPaths) {
  const concatListPath = path.join(outputRoot, `${outputBaseName}-concat.txt`);
  const concatBody = clipPaths
    .map((clipPath) => `file '${clipPath.replace(/'/g, "'\\''")}'`)
    .join('\n');
  await fs.writeFile(concatListPath, `${concatBody}\n`, 'utf-8');
  const encodeSettings = getEncodeSettings();

  await execFileAsync('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-map',
    '0:v:0',
    '-map',
    '0:a:0',
    '-vf',
    `fps=${fps},format=yuv420p`,
    '-r',
    String(fps),
    '-fps_mode',
    'cfr',
    '-af',
    'aresample=async=1:first_pts=0',
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
    '-video_track_timescale',
    String(Math.max(1000, fps * 1000)),
    '-movflags',
    '+faststart',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ar',
    '48000',
    '-ac',
    '2',
    outputPath,
  ]);
}

async function probeVideo(targetPath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_streams',
    '-show_format',
    '-of',
    'json',
    targetPath,
  ]);

  return JSON.parse(stdout);
}

await ensureDir(outputRoot);
await ensureDir(clipRoot);
if (!resume) {
  await fs.rm(clipRoot, { recursive: true, force: true });
  await ensureDir(clipRoot);
}

if (!skipBuild) {
  await ensureBuiltPreview();
} else {
  await fs.access(path.join(distRoot, 'video-preview', 'index.html'));
}
const previewServer = await ensurePreviewServer();

try {
  await waitForServer(`${baseUrl}/video-preview/`);
  const browser = await chromium.launch();

  try {
    const page = await createCapturePage(browser);

    const sceneDurations = [];
    for (const slug of sceneSlugs) {
      const durationMs = await loadScene(page, slug);
      sceneDurations.push({ slug, durationMs, frames: Math.max(2, Math.ceil((durationMs / 1000) * fps)) });
    }

    const totalFrames = sceneDurations.reduce((sum, scene) => sum + scene.frames, 0);
    const totalDurationMs = sceneDurations.reduce((sum, scene) => sum + scene.durationMs, 0);

    console.log(`PROGRAM CUT SCENES: ${sceneSlugs.length}`);
    console.log(`PROGRAM CUT DURATION: ${(totalDurationMs / 1000).toFixed(1)}s`);
    console.log(`PROGRAM CUT FRAMES: ${totalFrames}`);
    console.log('PROGRESS 0%');

    const progressState = {
      renderedFrames: 0,
      lastPercentLogged: 0,
    };

    const clipPaths = [];
    for (const [index, slug] of sceneSlugs.entries()) {
      const existingClipPath = getClipPath(slug, index);
      if (resume) {
        try {
          const stats = await fs.stat(existingClipPath);
          if (stats.isFile() && stats.size > 0) {
            progressState.renderedFrames += sceneDurations[index]?.frames ?? 0;
            const percent = Math.floor((progressState.renderedFrames / totalFrames) * 100);
            if (percent > progressState.lastPercentLogged) {
              progressState.lastPercentLogged = percent;
              console.log(`PROGRESS ${percent}%`);
            }
            console.log(`Reusing clip ${index + 1}/${sceneSlugs.length}: ${slug}`);
            clipPaths.push(existingClipPath);
            continue;
          }
        } catch {
          // Clip does not exist yet; render it below.
        }
      }

      const clipPath = await renderSceneClip(
        slug,
        sceneDurations[index]?.durationMs ?? 5600,
        index,
        sceneSlugs.length,
        totalFrames,
        progressState,
      );
      clipPaths.push(clipPath);
    }

    await page.close();
    await buildConcatVideo(clipPaths);

    const probe = await probeVideo(outputPath);
    const reportPath = path.join(outputRoot, `${outputBaseName}.ffprobe.json`);
    await fs.writeFile(reportPath, JSON.stringify(probe, null, 2), 'utf-8');

    console.log(`PROGRESS 100%`);
    console.log(`Saved program cut to ${outputPath}`);
    console.log(`Saved ffprobe report to ${reportPath}`);
  } finally {
    await browser.close();
  }
} finally {
  previewServer?.kill('SIGTERM');
}
