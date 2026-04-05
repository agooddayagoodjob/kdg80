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
const args = process.argv.slice(2);
const port = Number(process.env.VIDEO_STORY_PORT ?? '4327');
const baseUrl = `http://127.0.0.1:${port}`;
const qualityArg = args.find((value) => value.startsWith('--quality='));
const profileArg = args.find((value) => value.startsWith('--profile='));
const fpsArg = args.find((value) => value.startsWith('--fps='));
const tagArg = args.find((value) => value.startsWith('--tag='));
const audioArg = args.find((value) => value.startsWith('--audio='));
const audioStartArg = args.find((value) => value.startsWith('--audio-start-seconds='));
const skipBuild = args.includes('--skip-build');
const quality = qualityArg?.split('=')[1] ?? 'high';
const profile = profileArg?.split('=')[1] ?? 'playback-safe';
const fps = Number(fpsArg?.split('=')[1] ?? '30');
const audioPath = audioArg ? path.resolve(workspaceRoot, audioArg.split('=').slice(1).join('=')) : null;
const audioStartSeconds = Number(audioStartArg?.split('=')[1] ?? '0');
const outputTag = (tagArg?.split('=')[1] ?? 'next-week-20260406-20260412')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/-{2,}/g, '-')
  .replace(/^-+|-+$/g, '');
const outputRoot = path.join(
  workspaceRoot,
  'test-results',
  'video-story-20260405',
  outputTag ? `_${outputTag}` : '_next-week-20260406-20260412',
);
const clipRoot = path.join(outputRoot, 'clips');
const sceneBoardRoot = path.join(outputRoot, 'scene-board');
const outputBaseName = `festival-next-week-story-${profile}-${quality}-${fps}fps`;
const outputPath = path.join(outputRoot, `${outputBaseName}.mp4`);
const silentOutputPath = audioPath ? path.join(outputRoot, `${outputBaseName}.silent.mp4`) : outputPath;
const deliverableRoot = path.join(workspaceRoot, 'outputs', 'video');
const deliverablePath = path.join(deliverableRoot, `${outputBaseName}.mp4`);

const scenes = [
  { slug: 'week-intro', durationMs: 2800 },
  { slug: 'week-priroda-chemodana', durationMs: 5800 },
  { slug: 'week-zoo-right', durationMs: 6000 },
  { slug: 'week-nostalgia', durationMs: 5800 },
  { slug: 'week-bridge', durationMs: 6000 },
  { slug: 'week-site', durationMs: 3200 },
  { slug: 'week-telegram', durationMs: 3400 },
  { slug: 'week-max', durationMs: 3400 },
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

if (!Number.isFinite(audioStartSeconds) || audioStartSeconds < 0) {
  throw new Error(`Unsupported audio-start-seconds value: ${audioStartSeconds}`);
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

  throw new Error(`Timed out waiting for story preview server: ${url}`);
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
      maxrate: quality === 'high' ? '12M' : '8M',
      bufsize: quality === 'high' ? '24M' : '16M',
    };
  }

  return {
    h264Profile: 'main',
    level: '4.0',
    preset: quality === 'high' ? 'slow' : 'medium',
    crf: quality === 'high' ? '17' : '20',
    maxrate: quality === 'high' ? '7M' : '5M',
    bufsize: quality === 'high' ? '14M' : '10M',
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

  await fs.access(path.join(distRoot, 'video-story', 'index.html'));
}

async function ensurePreviewServer() {
  const previewIndexUrl = `${baseUrl}/video-story/`;

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
    window.__storyPreview?.pause?.();
    window.__storyPreview?.seek?.(targetMs);
  }, timeMs);
}

async function loadScene(page, slug) {
  await page.goto(`${baseUrl}/video-story/${slug}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-capture-root]');
  await page.waitForFunction(() => typeof window.__storyPreview?.seek === 'function');
}

function getCaptureViewport() {
  return {
    width: 1240,
    height: 2200,
  };
}

async function createCapturePage(browser) {
  return browser.newPage({
    viewport: getCaptureViewport(),
    deviceScaleFactor: 1,
  });
}

async function renderSceneClip(scene, index, totalScenes, totalFrames, progressState) {
  const totalSceneFrames = Math.max(2, Math.ceil((scene.durationMs / 1000) * fps));
  const clipPath = path.join(clipRoot, `${String(index + 1).padStart(2, '0')}-${scene.slug}.mp4`);
  const stillPath = path.join(sceneBoardRoot, `${String(index + 1).padStart(2, '0')}-${scene.slug}.png`);
  const tempClipPath = `${clipPath}.partial.mp4`;
  const encodeSettings = getEncodeSettings();
  const stillFrame = Math.min(totalSceneFrames - 1, Math.round(totalSceneFrames * 0.56));
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const frameDir = await fs.mkdtemp(path.join(os.tmpdir(), `video-story-${scene.slug}-`));
    let browser;

    try {
      browser = await chromium.launch();
      const page = await createCapturePage(browser);
      await loadScene(page, scene.slug);
      const captureRoot = page.locator('[data-capture-root]');

      console.log(
        `Rendering story scene ${index + 1}/${totalScenes}: ${scene.slug} (${totalSceneFrames} frames) [attempt ${attempt}/${maxAttempts}]`,
      );

      for (let frameIndex = 0; frameIndex < totalSceneFrames; frameIndex += 1) {
        const ms = Math.min(scene.durationMs - 1, Math.round((frameIndex * 1000) / fps));
        const framePath = path.join(frameDir, `frame-${String(frameIndex).padStart(5, '0')}.png`);

        await pauseAndSeek(page, ms);
        await flushAnimationFrame(page);
        await captureRoot.screenshot({ path: framePath, animations: 'allow' });

        if (frameIndex === stillFrame) {
          await captureRoot.screenshot({ path: stillPath, animations: 'allow' });
        }

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
        '-vf',
        'crop=1080:1920:0:0,format=yuv420p',
        '-c:v',
        'libx264',
      '-profile:v',
      encodeSettings.h264Profile,
      '-level:v',
      encodeSettings.level,
      '-preset',
      encodeSettings.preset,
      '-crf',
      encodeSettings.crf,
      '-maxrate',
      encodeSettings.maxrate,
      '-bufsize',
      encodeSettings.bufsize,
      '-movflags',
      '+faststart',
      '-g',
      String(Math.max(30, fps * 2)),
      '-pix_fmt',
      'yuv420p',
      tempClipPath,
      ]);

      await fs.rename(tempClipPath, clipPath);
      return clipPath;
    } catch (error) {
      lastError = error;
      console.warn(`Scene render retry ${attempt}/${maxAttempts} failed for ${scene.slug}: ${error.message}`);
      const rollbackFrames = Math.max(0, progressState.renderedFrames - totalSceneFrames);
      progressState.renderedFrames = rollbackFrames;
      progressState.lastPercentLogged = Math.floor((progressState.renderedFrames / totalFrames) * 100);
      await fs.rm(tempClipPath, { force: true });
      if (attempt === maxAttempts) {
        throw error;
      }
    } finally {
      await fs.rm(frameDir, { recursive: true, force: true });
      await browser?.close();
    }
  }

  throw lastError;
}

async function concatClips(clips, targetPath) {
  const encodeSettings = getEncodeSettings();
  const concatListPath = path.join(outputRoot, 'concat.txt');
  await fs.writeFile(
    concatListPath,
    `${clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join('\n')}\n`,
    'utf8',
  );

  await execFileAsync('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-c:v',
    'libx264',
    '-profile:v',
    encodeSettings.h264Profile,
    '-level:v',
    encodeSettings.level,
    '-preset',
    encodeSettings.preset,
    '-crf',
    encodeSettings.crf,
    '-maxrate',
    encodeSettings.maxrate,
    '-bufsize',
    encodeSettings.bufsize,
    '-movflags',
    '+faststart',
    '-r',
    String(fps),
    '-pix_fmt',
    'yuv420p',
    '-an',
    targetPath,
  ]);
}

async function muxAudioTrack(videoPath, targetPath) {
  const totalDurationSeconds = scenes.reduce((total, scene) => total + scene.durationMs, 0) / 1000;

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-ss',
    String(audioStartSeconds),
    '-i',
    audioPath,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    '-t',
    String(totalDurationSeconds),
    '-shortest',
    targetPath,
  ]);
}

async function main() {
  await ensureDir(outputRoot);
  await ensureDir(clipRoot);
  await ensureDir(sceneBoardRoot);
  await ensureDir(deliverableRoot);

  if (audioPath) {
    await fs.access(audioPath);
  }

  if (!skipBuild) {
    await ensureBuiltPreview();
  } else {
    await fs.access(path.join(distRoot, 'video-story', 'index.html'));
  }

  const previewServer = await ensurePreviewServer();
  const progressState = {
    renderedFrames: 0,
    lastPercentLogged: -1,
  };

  const totalFrames = scenes.reduce(
    (total, scene) => total + Math.max(2, Math.ceil((scene.durationMs / 1000) * fps)),
    0,
  );

  try {
    const clips = [];
    for (let index = 0; index < scenes.length; index += 1) {
      const scene = scenes[index];
      clips.push(await renderSceneClip(scene, index, scenes.length, totalFrames, progressState));
    }

    await concatClips(clips, silentOutputPath);
    if (audioPath) {
      await muxAudioTrack(silentOutputPath, outputPath);
      await fs.rm(silentOutputPath, { force: true });
    }
    await fs.copyFile(outputPath, deliverablePath);
    console.log(`Rendered weekly story: ${outputPath}`);
    console.log(`Copied deliverable: ${deliverablePath}`);
  } finally {
    previewServer?.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
