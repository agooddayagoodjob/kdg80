/**
 * Generate participant passport PDF (A4 landscape, two A5 halves).
 *
 * Prerequisites:
 *   cd site && npm install playwright && npx playwright install chromium
 *
 * Usage:
 *   cd site && npm run passport:pdf
 * or
 *   node scripts/generate-passport-pdf.mjs
 *
 * The script:
 *   1. Serves the built site (site/dist) on a local HTTP server
 *   2. Opens the passport page with Playwright in print-emulation mode
 *   3. Generates a single-page A4 landscape PDF
 *   4. Saves it to site/dist/pasport-uchastnika/passport-a4.pdf
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'site', 'dist');
const OUT_PDF = path.join(DIST, 'pasport-uchastnika', 'passport-a4.pdf');

if (!fs.existsSync(path.join(DIST, 'pasport-uchastnika', 'index.html'))) {
  console.error('ERROR: site/dist/pasport-uchastnika/index.html not found.');
  console.error('Run "cd site && npm run build" first.');
  process.exit(1);
}

// Minimal static file server for site/dist
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
};

function serve(distDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (urlPath.endsWith('/')) urlPath += 'index.html';

      const filePath = path.join(distDir, urlPath);
      if (!filePath.startsWith(distDir)) {
        res.writeHead(403);
        res.end();
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

// Import Playwright
let chromium;
try {
  const pkg = await import(path.join(ROOT, 'site', 'node_modules', 'playwright', 'index.js'));
  chromium = pkg.default?.chromium ?? pkg.chromium;
} catch {
  console.error('ERROR: Playwright not installed. Run:');
  console.error('  cd site && npm install playwright && npx playwright install chromium');
  process.exit(1);
}

const { server, port } = await serve(DIST);
console.log(`Serving site/dist on http://127.0.0.1:${port}`);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();

await page.emulateMedia({ media: 'print', colorScheme: 'light' });

await page.goto(`http://127.0.0.1:${port}/pasport-uchastnika/`, {
  waitUntil: 'networkidle',
});

await page.evaluate(async () => {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
});

// Wait for images and layout to settle
await page.waitForTimeout(800);

await page.pdf({
  path: OUT_PDF,
  format: 'A4',
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  pageRanges: '1',
});

console.log(`PDF saved: ${OUT_PDF}`);

// Also take a screenshot for visual verification
const screenshotPath = path.join(DIST, 'pasport-uchastnika', 'passport-preview.png');
await page.emulateMedia({ media: 'screen', colorScheme: 'light' });
await page.setViewportSize({ width: 1200, height: 850 });
await page.screenshot({ path: screenshotPath, fullPage: false });
console.log(`Preview screenshot: ${screenshotPath}`);

await browser.close();
server.close();
