import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { prepareSpeakerStripPortraits } from './prepare_speaker_strip_portraits.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(siteRoot, '..');
const assetsRoot = path.join(workspaceRoot, 'assets');
const sourceDataRoot = path.join(workspaceRoot, 'Исходные данные');
const publicRoot = path.join(siteRoot, 'public');
const sharedAssetsRoot = path.join(publicRoot, 'shared-assets');
const festivalMediaPath = path.join(publicRoot, 'festival-media');
const telegramPngPath = path.join(publicRoot, 'generated', 'telegram', 'kenigevents-qr.png');
const generatedRoot = path.join(publicRoot, 'generated');
const registrationManifestUrl = 'https://kgd80.ru/tickets/registration/states.json';
const registrationManifestCachePath = path.join(siteRoot, 'src', 'data', 'registration-state-manifest.json');

const ALLOWED_EXTENSIONS = new Set(['.webp', '.svg', '.woff2', '.otf', '.txt']);
const EXTRA_SHARED_ASSETS = [
  {
    sourcePath: path.join(sourceDataRoot, 'znanie main.svg'),
    destinationPath: path.join(sharedAssetsRoot, 'logo-znanie-main.svg'),
  },
  {
    sourcePath: path.join(sourceDataRoot, 'Festival logo.svg'),
    destinationPath: path.join(sharedAssetsRoot, 'logo-znanie-festival.svg'),
  },
  {
    sourcePath: path.join(sourceDataRoot, 'logo-80-istorii-hero.svg'),
    destinationPath: path.join(sharedAssetsRoot, 'logo-80-istorii-hero.svg'),
  },
];
const NORMALIZATION_SPECS = [
  {
    label: 'speakers',
    root: path.join(generatedRoot, 'speakers'),
    maxWidth: 840,
    maxHeight: 920,
    quality: 84,
  },
  {
    label: 'lecture-portraits',
    root: path.join(generatedRoot, 'lecture-portraits'),
    maxWidth: 760,
    maxHeight: 560,
    quality: 84,
  },
  {
    label: 'events',
    root: path.join(generatedRoot, 'events'),
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 82,
  },
];

async function removeIfExists(targetPath) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyAllowedAssets(sourceDir, destinationDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      await ensureDir(destinationPath);
      await copyAllowedAssets(sourcePath, destinationPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    await ensureDir(path.dirname(destinationPath));
    await fs.copyFile(sourcePath, destinationPath);
  }
}

async function copyExtraAssets(items) {
  for (const item of items) {
    try {
      await ensureDir(path.dirname(item.destinationPath));
      await fs.copyFile(item.sourcePath, item.destinationPath);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
}

async function listWebpFiles(rootDir) {
  if (!await pathExists(rootDir)) {
    return [];
  }

  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.webp')
    .map((entry) => path.join(rootDir, entry.name))
    .sort();
}

async function getImageSize(targetPath) {
  const { stdout } = await execFileAsync('identify', ['-format', '%w %h', targetPath], {
    cwd: workspaceRoot,
  });
  const [widthText, heightText] = stdout.trim().split(/\s+/u);
  return {
    width: Number.parseInt(widthText, 10),
    height: Number.parseInt(heightText, 10),
  };
}

async function normalizeWebpInPlace(targetPath, spec) {
  const { width, height } = await getImageSize(targetPath);
  if (width <= spec.maxWidth && height <= spec.maxHeight) {
    return false;
  }

  const tempPath = `${targetPath}.tmp.webp`;

  try {
    await execFileAsync(
      'convert',
      [
        targetPath,
        '-filter',
        'LanczosSharp',
        '-define',
        'filter:blur=0.96',
        '-resize',
        `${spec.maxWidth}x${spec.maxHeight}>`,
        '-strip',
        '-define',
        'webp:method=6',
        '-define',
        'webp:alpha-quality=100',
        '-quality',
        String(spec.quality),
        tempPath,
      ],
      { cwd: workspaceRoot },
    );
    await fs.rename(tempPath, targetPath);
    return true;
  } catch (error) {
    await removeIfExists(tempPath);
    throw error;
  }
}

async function normalizeGeneratedMedia() {
  const report = [];

  for (const spec of NORMALIZATION_SPECS) {
    const files = await listWebpFiles(spec.root);
    let normalized = 0;

    for (const filePath of files) {
      if (await normalizeWebpInPlace(filePath, spec)) {
        normalized += 1;
      }
    }

    report.push(`${spec.label}:${normalized}/${files.length}`);
  }

  return report.join(', ');
}

async function refreshRegistrationManifestCache() {
  try {
    const { stdout } = await execFileAsync('curl', ['-fsSL', '--max-time', '20', registrationManifestUrl], {
      cwd: workspaceRoot,
    });
    const payload = JSON.parse(stdout);
    await ensureDir(path.dirname(registrationManifestCachePath));
    await fs.writeFile(`${registrationManifestCachePath}.tmp`, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
    await fs.rename(`${registrationManifestCachePath}.tmp`, registrationManifestCachePath);
    return 'refreshed';
  } catch (error) {
    if (await pathExists(registrationManifestCachePath)) {
      console.warn(`Registration manifest refresh skipped, using cached copy: ${error instanceof Error ? error.message : String(error)}`);
      return 'cached';
    }
    throw error;
  }
}

await removeIfExists(sharedAssetsRoot);
await removeIfExists(festivalMediaPath);
await removeIfExists(telegramPngPath);
await ensureDir(sharedAssetsRoot);
await copyAllowedAssets(assetsRoot, sharedAssetsRoot);
await copyExtraAssets(EXTRA_SHARED_ASSETS);
await prepareSpeakerStripPortraits();
const normalizationReport = await normalizeGeneratedMedia();
const registrationManifestStatus = await refreshRegistrationManifestCache();

console.log(`Prepared public assets, regenerated speaker-strip portraits, normalized oversized media (${normalizationReport}), registration manifest ${registrationManifestStatus}.`);
