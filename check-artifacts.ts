import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import { buildBoard } from './lib/model.ts';
import type { Snapshot } from './lib/model.ts';

const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? 'out');
const inputFlag = process.argv.indexOf('--input');
if (inputFlag < 0 || !process.argv[inputFlag + 1]) throw new Error('Usage: node check-artifacts.ts --input <snapshot.json>');
const snapshot = JSON.parse(readFileSync(resolve(process.argv[inputFlag + 1]!), 'utf8')) as Snapshot;
const board = JSON.parse(readFileSync(join(output, 'board.json'), 'utf8'));
const rows = Array.isArray(board) ? board : board.rows;
const results: Array<{ name: string; ok: boolean; detail: string }> = [];

function check(name: string, run: () => string): void {
  try {
    results.push({ name, ok: true, detail: run() });
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function filesUnder(directory: string, prefix = ''): Array<{ path: string; bytes: Buffer }> {
  const out: Array<{ path: string; bytes: Buffer }> = [];
  for (const entry of readdirSync(join(directory, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert(!entry.name.startsWith('.'), `${path}: dotfiles and dot-directories are refused`);
    assert(/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(entry.name), `${path}: invalid plain name`);
    const stat = lstatSync(join(directory, path));
    if (entry.isDirectory()) out.push(...filesUnder(directory, path));
    else {
      assert(stat.isFile(), `${path}: not a regular file`);
      out.push({ path, bytes: readFileSync(join(directory, path)) });
    }
  }
  return out;
}

check('dashboard_files', () => {
  const files = filesUnder(join(output, 'dashboard'));
  assert(files.some((file) => file.path === 'index.html'), 'missing index.html');
  assert(files.some((file) => file.path.endsWith('.css')), 'missing CSS');
  assert(files.some((file) => file.path.endsWith('.js')), 'missing JavaScript');
  assert(files.length <= 400, `${files.length} files exceeds 400`);
  const bytes = files.reduce((sum, file) => sum + file.bytes.length, 0);
  assert(bytes < 64 * 1024, `${bytes} source bytes exceeds the brief's 64 KB budget`);
  assert(bytes <= 4 * 1024 * 1024, `${bytes} bytes exceeds 4 MiB`);
  for (const file of files) {
    const text = file.bytes.toString('utf8');
    if (/\.(?:html|css|js)$/.test(file.path)) assert(!/https?:\/\//i.test(text), `${file.path}: external HTTP(S) reference`);
  }
  return `${files.length} files, ${bytes} source bytes, local-only assets`;
});

check('board_file', () => {
  assert(Array.isArray(rows), 'rows is not an array');
  assert(rows.length >= 100 && rows.length <= 4000, `row count ${rows.length} is outside 100–4000`);
  const protocols = new Set(snapshot.protocols.map((protocol) => protocol.slug));
  const slugs = new Set<string>();
  const values = new Set<number>();
  for (const row of rows) {
    assert(row && typeof row.slug === 'string' && protocols.has(row.slug), `unknown slug ${row?.slug}`);
    assert(!slugs.has(row.slug), `duplicate slug ${row.slug}`);
    assert(typeof row.name === 'string' && row.name.length > 0, `${row.slug}: empty name`);
    assert(Number.isSafeInteger(row.rank) && row.rank >= 1, `${row.slug}: invalid rank`);
    assert(Number.isSafeInteger(row.implied_value_usd) && row.implied_value_usd >= 1 && row.implied_value_usd <= 1e14, `${row.slug}: invalid value`);
    assert(Array.isArray(row.farm_steps), `${row.slug}: farm_steps is not an array`);
    slugs.add(row.slug);
    values.add(row.implied_value_usd);
  }
  assert(values.size > 1, 'all implied values are equal');
  assert(readFileSync(join(output, 'board.json')).length <= 8 * 1024 * 1024, 'board exceeds 8 MiB');
  return `${rows.length} unique protocol rows with varying whole-dollar values`;
});

check('sorted_by_value', () => {
  const ranked = [...rows].sort((a, b) => a.rank - b.rank);
  ranked.forEach((row, index) => {
    assert(row.rank === index + 1, `rank ${row.rank} at position ${index}; expected ${index + 1}`);
    if (index > 0) assert(row.implied_value_usd <= ranked[index - 1].implied_value_usd, `value rises at rank ${row.rank}`);
  });
  let crossed = false;
  for (const row of ranked) {
    const hasToken = !(snapshot.protocols.find((protocol) => protocol.slug === row.slug)?.gecko_id === null && snapshot.protocols.find((protocol) => protocol.slug === row.slug)?.symbol === null);
    if (hasToken) crossed = true;
    else assert(!crossed, `${row.slug}: tokenless row follows a traded-token row`);
  }
  return `ranks 1–${rows.length} are unique and values never rise`;
});

check('coverage', () => {
  const slugs = new Set(rows.map((row) => row.slug));
  const missing = snapshot.watchlist.filter((slug) => !slugs.has(slug));
  assert(missing.length === 0, `missing watchlist slugs: ${missing.join(', ')}`);
  const outside = rows.filter((row) => !snapshot.watchlist.includes(row.slug)).length;
  assert(outside >= 60, `only ${outside} rows outside the watchlist`);
  return `${snapshot.watchlist.length}/${snapshot.watchlist.length} watchlist slugs; ${outside} additional protocols`;
});

check('farm_steps', () => {
  let count = 0;
  for (const row of rows) {
    assert(row.farm_steps.length >= 3 && row.farm_steps.length <= 12, `${row.slug}: wrong step count`);
    for (const step of row.farm_steps) {
      assert(typeof step === 'string' && step.trim().length >= 20 && step.trim().length <= 600, `${row.slug}: invalid step length`);
      count += 1;
    }
  }
  return `${count} concrete steps, each 20–600 trimmed characters`;
});

check('screenshots', () => {
  const directory = join(output, 'screenshots');
  const names = readdirSync(directory).filter((name) => !name.startsWith('.'));
  assert(names.length === 3 || names.length === 4, `${names.length} screenshots; expected 3 or 4`);
  for (const expected of ['1-board.png', '2-detail.png', '3-filtered.png']) assert(names.includes(expected), `missing ${expected}`);
  for (const name of names) {
    assert(/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(name), `${name}: invalid name`);
    assert(lstatSync(join(directory, name)).isFile(), `${name}: not a regular file`);
    const bytes = readFileSync(join(directory, name));
    assert(bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `${name}: not PNG`);
    assert(bytes.subarray(-8).equals(Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])), `${name}: incomplete PNG`);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    assert(width === 1440 && height === 900, `${name}: ${width}x${height}, expected 1440x900`);
    // Range, not an exact count: a collapsed render is a named failure instead of a number nobody reads.
    // Window tightened to 307,200-358,400 bytes per work_7dfd321917 (recorded 322,285 / 347,462 / 321,416).
    assert(bytes.length >= 307200 && bytes.length <= 358400, `${name}: ${bytes.length} bytes outside 307,200-358,400`);
    assert(bytes.length <= 512 * 1024, `${name}: over 512 KiB`);
  }
  return names.map((name) => `${name}: 1440x900, ${readFileSync(join(directory, name)).length} bytes`).join('; ');
});

// WHY (Lesson 16, docs/kindling-training-lessons.md; token-radar-01 release, 25 Nov 2026;
// work_7dfd321917): the gate passed 7/7 while the dashboard painted nothing - reviewHours was a
// const called by farmSteps during the rows.map, a temporal-dead-zone throw before first paint.
// The only witness was a screenshot collapsing 347,462 -> 105,432 bytes. A gate that parses
// artifacts is not a gate that reads the page, so this row executes the page and counts the DOM.
// The render runs out of process (render-probe.py, Playwright/Chromium) because this clone has no
// node_modules: an in-process import would throw at load and take all eight rows down with it.
check('renders', () => {
  const dashboard = join(output, 'dashboard');
  const index = join(dashboard, 'index.html');
  assert(existsSync(index), `missing ${index}`);
  const probe = join(dirname(fileURLToPath(import.meta.url)), 'render-probe.py');
  assert(existsSync(probe), `missing ${probe}`);
  // WHY (work_7dfd321917, proof obligation, corrected live 26 Nov 2026): the expected count is
  // derived from the SNAPSHOT via buildBoard, never from board.json. Two circular versions were
  // measured failing this obligation before this one: (a) no --expect at all, so the probe compared
  // the DOM against the same blank board it painted and reported ok:true (0 == 0); (b) --expect
  // rows.length, where `rows` is bound from board.json at module load, so a blanked board pinned
  // the expectation to 0 and the row still PASSED a blank dashboard. buildBoard(snapshot) is the
  // independent oracle: the board cannot influence the count it is judged against.
  const expectedRows = buildBoard(snapshot).rows.length;
  // WHY (work_7dfd321917-s2, declared-work discipline): a snapshot that builds 0 rows is a NAMED
  // failure, not a vacuous pass. With expectedRows === 0 the count assertion below is 0 == 0 and
  // the row would certify a dashboard that painted nothing - the exact false pass this row exists
  // to prevent. This check runs before the probe so the message names the real cause.
  assert(
    expectedRows > 0,
    'board-empty: the snapshot builds 0 rows, so a blank dashboard cannot be distinguished from a correct one',
  );
  const run = spawnSync('python3', [probe, dashboard, join(output, 'board.json'), '--expect', String(expectedRows)], {
    encoding: 'utf8',
    timeout: 90_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const stdout = (run.stdout ?? '').trim();
  assert(run.status === 0, `render probe exited ${run.status}: ${stdout || (run.stderr ?? '').trim() || 'no output'}`);
  let verdict: {
    ok: boolean;
    error?: string;
    expected: number;
    tbody_count: number;
    empty_hidden: boolean | null;
    detail_visible: boolean;
    detail_name: string | null;
    first_name: string | null;
    page_error: string | null;
    blank?: boolean;
  };
  try {
    verdict = JSON.parse(stdout);
  } catch {
    throw new Error(`render probe printed no JSON verdict: ${stdout.slice(0, 200)}`);
  }
  // WHY (work_7dfd321917, corrected live 26 Nov 2026): the row-count assertion runs BEFORE the
  // generic ok check. The probe reports ok:false with no error string on a blank board, so the
  // generic check fired first and the gate printed "render probe failed: unknown error" - a
  // failure with no number in it. The brief requires the row-count message, so the count speaks
  // first and the generic check is the fallback for failures the count cannot explain.
  assert(
    verdict.tbody_count === verdict.expected,
    `rendered ${verdict.tbody_count} tbody rows, expected ${verdict.expected}`,
  );
  // WHY (work_7dfd321917-s2, declared-work discipline): an uncaught page exception is named
  // before the generic ok check, for the same reason the count speaks first - the incident this
  // row exists for was a throw before first paint, and "unknown error" hides that. A page that
  // threw is a failure even if the row count happens to match.
  assert(
    !verdict.page_error,
    `dashboard threw before paint: ${verdict.page_error}`,
  );
  // WHY (work_7dfd321917-s2, declared-work discipline): a blank dashboard is named explicitly.
  // The count assertion above already fails a blank page when the snapshot has rows, but this
  // row must also refuse the degenerate case where the expectation itself is zero - a gate that
  // passes 0 == 0 has certified nothing. The probe reports `blank` when the page painted no rows
  // and showed its own empty state, which is the signature of the Lesson 16 throw-before-paint.
  assert(
    verdict.blank !== true,
    'blank dashboard: the page painted no rows and showed its empty state',
  );
  assert(verdict.ok, `render probe failed: ${verdict.error ?? 'unknown error'}`);
  assert(
    verdict.expected === expectedRows,
    `page data source has ${verdict.expected} rows, snapshot builds ${expectedRows}`,
  );
  assert(
    rows.length === expectedRows,
    `board.json has ${rows.length} rows, snapshot builds ${expectedRows}`,
  );
  if (verdict.expected > 0) {
    assert(verdict.detail_visible, 'detail panel shows no visible protocol name after opening the first row');
    assert(
      verdict.detail_name === verdict.first_name,
      `detail panel shows ${JSON.stringify(verdict.detail_name)}, expected ${JSON.stringify(verdict.first_name)}`,
    );
    assert(verdict.empty_hidden === true, 'empty-state element is visible while rows exist');
  }
  return `${verdict.tbody_count} tbody rows = ${verdict.expected} expected; detail shows ${JSON.stringify(verdict.detail_name)}; empty-state hidden`;
});

check('dossier_matches', () => {
  const path = join(output, 'dossier.json');
  assert(existsSync(path), 'missing dossier.json');
  const actual = readFileSync(path);
  const expected = Buffer.from(buildDossier(output, { text_max_bytes: 65536 }));
  assert(actual.equals(expected), 'dossier differs from buildDossier output');
  assert(actual.length <= 1.5 * 1024 * 1024, `dossier is ${actual.length} bytes, over 1.5 MiB`);
  return `byte-for-byte match; ${actual.length} bytes`;
});

for (const result of results) console.log(`${result.ok ? 'pass' : 'FAIL'}  ${result.name.padEnd(18)} ${result.detail}`);
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} artifact rows passed.`);
if (failed.length > 0) process.exitCode = 1;
