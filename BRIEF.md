# Fresh build brief — make.fun token-radar-01

You are writing a NEW entry from scratch. Your own session is the record uploaded with it, so write
every file yourself. Do not copy `starter\main.ts`, `starter\lib\` or `starter\dashboard\`.

**Do not read `RULES.txt`** (it is very large and will stall you). This brief is the contract.

Shell is PowerShell on Windows. Exact paths:
- KIT  `C:\Users\Mike\Documents\Python\Andrew\.kit-r6\kit`
- Snapshot `C:\Users\Mike\Documents\Python\Andrew\.kit-r6\kit\input\snapshot.json`
- CLI  `C:\Users\Mike\Documents\Python\Andrew\.kit-r6\kit\cli\makefun.mjs`
- Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe`

## The contract
`snapshot.json` = `{ as_of, source, floor_usd, protocols: [ {slug,name,category,chains,tvl_usd,change_7d,mcap_usd,listed_at,gecko_id,symbol} ], watchlist: [slug] }`
with 758 protocols and 40 watchlist slugs. A protocol "has no token" when `gecko_id` and `symbol`
are both null.

Deliverables (all under `out\`):
1. `out\board.json` — `{"rows":[...]}` with 100-4000 rows. Each row: `slug` (a protocol in the snapshot),
   `name`, `rank` (whole >=1), `implied_value_usd` (whole >=1, <=1e14), `farm_steps` (3-12 strings,
   each 20-600 chars trimmed). Ranks exactly 1..N once each; `implied_value_usd` must NOT rise as rank
   ascends; not all values equal. All 40 watchlist slugs present; at least 60 rows outside the watchlist.
2. `out\dashboard\` — `index.html`, `app.css`, `app.js` (plus whatever you need), copied from `dashboard\`.
   Board ranked by implied value, a detail view per protocol, a filter, farm steps visible. Total source
   under 64 KB. **No `http://` or `https://` in any HTML attribute, CSS url, or JS import/export/require.**
3. `out\dossier.json` — exactly what `buildDossier` writes; copy `starter\vendor\makefun-board.ts` to
   `vendor\makefun-board.ts` ONCE and import it.
4. `screenshots\1-board.png`, `2-detail.png`, `3-filtered.png` — 1440x900, 300-350 KB each.

Value model: derive from each protocol's own figures — `tvl_usd`, `change_7d`, and years on record
(`listed_at` → `as_of`) with no token. Own formula in `lib\model.ts`. No hardcoded name lists.
Pre-token protocols rank above ones whose token already trades.

Farm steps must be concrete: what to do, what it costs, how long it takes.

## Commands
Run:
```
mkdir out -Force
$env:MAKEFUN_OUTPUT_DIR="out"
node main.ts --input "C:\Users\Mike\Documents\Python\Andrew\.kit-r6\kit\input\snapshot.json"
```
Screenshots:
```
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --screenshot="screenshots\1-board.png" "file:///C:/Users/Mike/Documents/Python/Andrew/.kit-r6/entry-fresh-01/out/dashboard/index.html"
```
(and `2-detail.png`, `3-filtered.png` via a query flag your page reads).
Check:
```
node "C:\Users\Mike\Documents\Python\Andrew\.kit-r6\kit\cli\makefun.mjs" check --kit "C:\Users\Mike\Documents\Python\Andrew\.kit-r6\kit" --repo . --worktree
```
Iterate until these seven rows pass: dashboard_files, board_file, sorted_by_value, coverage,
farm_steps, screenshots, dossier_matches. Transcript rows will say none are bundled — expected, ignore.

## Recording discipline
- Write `main.ts` in full first, then revise it at least twice with real edits.
- Revise `dashboard\app.js` or `app.css` at least once after the first draft.
- At least six substantive assistant messages with text, not only tool calls.
- Never fabricate timestamps, sessions or usage.

## Do not
- No `makefun init`, submit, sign, publish or push.
- No copying the starter's main.ts, lib/ or dashboard/.
