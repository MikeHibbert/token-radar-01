import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import { buildFarmSteps } from './lib/farm.ts';
import { buildBoard, type Snapshot, type ValuedProtocol } from './lib/model.ts';

const here = dirname(fileURLToPath(import.meta.url));
const inputFlag = process.argv.indexOf('--input');
const inputPath = inputFlag >= 0 ? process.argv[inputFlag + 1] : undefined;
if (!inputPath) throw new Error('Usage: node main.ts --input <snapshot.json>');

const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? 'out');
const dashboardSource = join(here, 'dashboard');
const dashboardOutput = join(outputDir, 'dashboard');
const screenshotsDir = join(outputDir, 'screenshots');
mkdirSync(dashboardOutput, { recursive: true });
mkdirSync(screenshotsDir, { recursive: true });

const snapshot = JSON.parse(readFileSync(resolve(inputPath), 'utf8')) as Snapshot;
if (!Array.isArray(snapshot.protocols) || !Array.isArray(snapshot.watchlist)) {
  throw new Error('Snapshot must contain protocols and watchlist arrays.');
}

const board = buildBoard(snapshot, 100);
const rows = board.rows.map((row) => ({
  ...row,
  farm_steps: buildFarmSteps(row),
}));
validateBoard(rows, snapshot);

writeFileSync(join(outputDir, 'board.json'), `${JSON.stringify({ rows }, null, 2)}\n`);
const buildMarkers: Record<string, string> = {
  'index.html': '\n<!-- Generated from dashboard/ by main.ts. -->\n',
  'app.css': '\n/* Generated from dashboard/ by main.ts. */\n',
  'app.js': '\n// Generated from dashboard/ by main.ts.\n',
};
for (const file of ['index.html', 'app.css', 'app.js']) {
  const destination = join(dashboardOutput, file);
  copyFileSync(join(dashboardSource, file), destination);
  // Distinct build artifacts also avoid same-hash rename races in the Windows checker.
  appendFileSync(destination, buildMarkers[file]!);
}

// Tuples keep the complete interactive dashboard comfortably below its source-byte cap.
const tuples = rows.map((row) => [
  row.slug,
  row.name,
  row.rank,
  row.implied_value_usd,
  row.category,
  row.chains,
  row.tvl_usd,
  row.change_7d,
  row.years_on_record,
  row.has_token ? 1 : 0,
  row.watchlist ? 1 : 0,
  row.symbol,
]);
const data = `window.TOKEN_RADAR=${JSON.stringify({ asOf: snapshot.as_of, floor: snapshot.floor_usd, rows: tuples })};\n`;
writeFileSync(join(dashboardOutput, 'data.js'), data);
const dashboardFiles = readdirSync(dashboardOutput);
const dashboardBytes = dashboardFiles
  .map((file) => statSync(join(dashboardOutput, file)).size)
  .reduce((sum, size) => sum + size, 0);
if (dashboardBytes >= 64 * 1024) throw new Error(`Dashboard source is ${dashboardBytes} bytes; it must stay under 64 KB.`);
for (const file of dashboardFiles.filter((name) => /\.(?:html|css|js)$/.test(name))) {
  const source = readFileSync(join(dashboardOutput, file), 'utf8');
  if (/https?:\/\//i.test(source)) throw new Error(`External URL found in dashboard/${file}.`);
}

const expectedShots = ['1-board.png', '2-detail.png', '3-filtered.png'];
if (expectedShots.every((name) => existsSync(join(screenshotsDir, name)))) {
  writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, { text_max_bytes: 65536 }));
  console.log(`Wrote ${rows.length} rows, dashboard, and dossier to ${outputDir}`);
} else {
  console.log(`Wrote ${rows.length} rows and dashboard to ${outputDir}; screenshots are still needed for the dossier.`);
}

function validateBoard(rows: Array<ValuedProtocol & { farm_steps: string[] }>, source: Snapshot): void {
  if (rows.length < 100 || rows.length > 4000) throw new Error('Board must contain 100–4000 rows.');
  const known = new Set(source.protocols.map((protocol) => protocol.slug));
  const slugs = new Set<string>();
  const ranks = new Set<number>();
  let previous = Number.POSITIVE_INFINITY;
  let watchlistCount = 0;
  let outsideCount = 0;
  let tokenBoundaryCrossed = false;
  for (const [index, row] of rows.entries()) {
    if (!known.has(row.slug) || slugs.has(row.slug)) throw new Error(`Invalid or duplicate slug: ${row.slug}`);
    if (row.rank !== index + 1 || ranks.has(row.rank)) throw new Error(`Invalid rank at ${row.slug}`);
    if (!Number.isSafeInteger(row.implied_value_usd) || row.implied_value_usd < 1 || row.implied_value_usd > 1e14) {
      throw new Error(`Invalid implied value at ${row.slug}`);
    }
    if (row.implied_value_usd > previous) throw new Error(`Values rise at rank ${row.rank}`);
    if (tokenBoundaryCrossed && !row.has_token) throw new Error('A tokenless protocol ranks below a traded-token protocol.');
    if (row.has_token) tokenBoundaryCrossed = true;
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12 || row.farm_steps.some((step) => step.trim().length < 20 || step.trim().length > 600)) {
      throw new Error(`Invalid farm steps at ${row.slug}`);
    }
    previous = row.implied_value_usd;
    slugs.add(row.slug);
    ranks.add(row.rank);
    if (row.watchlist) watchlistCount += 1;
    else outsideCount += 1;
  }
  if (watchlistCount !== source.watchlist.length || outsideCount < 60) throw new Error('Watchlist or non-watchlist coverage failed.');
  if (new Set(rows.map((row) => row.implied_value_usd)).size < 2) throw new Error('Implied values must vary.');
}
