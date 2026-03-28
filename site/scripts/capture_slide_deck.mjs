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
const outputRoot = path.join(workspaceRoot, 'test-results', 'slide-deck-20260328');
const baseUrl = 'http://127.0.0.1:4321';
const slideArg = process.argv.find((value) => !value.startsWith('--') && value !== process.argv[1] && value !== process.argv[0]);
const captureAll = process.argv.includes('--all') || !slideArg;
const shouldBuild = process.argv.includes('--build');

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
  const previewIndexUrl = `${baseUrl}/slide-preview/`;

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

  await fs.access(path.join(distRoot, 'slide-preview', 'index.html'));
}

async function readSlideLinks() {
  const response = await fetch(`${baseUrl}/slide-preview/`);
  const html = await response.text();
  const matches = [...html.matchAll(/\/slide-preview\/([^/]+)\//g)];
  return [...new Set(matches.map((match) => match[1]).filter(Boolean))];
}

async function captureSlide(browser, slug, index) {
  const page = await browser.newPage({
    viewport: { width: 2560, height: 1440 },
    deviceScaleFactor: 1,
  });

  await page.goto(`${baseUrl}/slide-preview/${slug}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-capture-root]');

  const slidePath = path.join(outputRoot, `${String(index + 1).padStart(2, '0')}-${slug}.png`);
  await page.locator('[data-capture-root]').screenshot({ path: slidePath, animations: 'disabled' });
  await page.close();
  return slidePath;
}

async function buildContactSheet(paths) {
  const outputPath = path.join(outputRoot, 'contact-sheet.webp');
  await execFileAsync('montage', [
    ...paths,
    '-tile',
    '4x',
    '-geometry',
    '480x270+14+14',
    '-background',
    '#161212',
    outputPath,
  ]);
  return outputPath;
}

await ensureBuiltPreview();
const devServer = await ensurePreviewServer();

try {
  await waitForServer(`${baseUrl}/slide-preview/`);
  await fs.rm(outputRoot, { recursive: true, force: true });
  await ensureDir(outputRoot);

  const slideSlugs = captureAll ? await readSlideLinks() : [slideArg];
  const browser = await chromium.launch();

  try {
    const paths = [];
    for (const [index, slug] of slideSlugs.entries()) {
      console.log(`Capturing ${slug}...`);
      paths.push(await captureSlide(browser, slug, index));
    }

    if (captureAll) {
      await buildContactSheet(paths);
      await fs.writeFile(
        path.join(outputRoot, 'slides.json'),
        JSON.stringify(slideSlugs.map((slug, index) => ({ index: index + 1, slug })), null, 2),
        'utf-8',
      );
    }
  } finally {
    await browser.close();
  }

  console.log(`Saved slide deck captures to ${outputRoot}`);
} finally {
  devServer?.kill('SIGTERM');
}
