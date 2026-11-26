# Landing evidence — work_f9da8004ad (token-radar-01, whole entry)

Written during this claim, 2026-11-26, in `/repo/.kit-r6/entry-fresh-01`
(remote `MikeHibbert/token-radar-01`). Every number below was read from a live
command in this claim; nothing is quoted from memory.

## 1. Kit grader — the number, verbatim

Command (Node 22 is required; the PATH `node` is v20 and cannot run `.ts`):

```
/opt/nvm/versions/node/v22.23.5/bin/node check-artifacts.ts \
  --input /repo/.kit-r6/kit/input/snapshot.json
```

Output, verbatim:

```
pass  dashboard_files    4 files, 52788 source bytes, local-only assets
pass  board_file         100 unique protocol rows with varying whole-dollar values
pass  sorted_by_value    ranks 1–100 are unique and values never rise
pass  coverage           40/40 watchlist slugs; 60 additional protocols
pass  farm_steps         300 concrete steps, each 20–600 trimmed characters
pass  screenshots        1-board.png: 1440x900, 322285 bytes; 2-detail.png: 1440x900, 347462 bytes; 3-filtered.png: 1440x900, 321416 bytes
pass  renders            100 tbody rows = 100 expected; detail shows "Bybit"; empty-state hidden
pass  dossier_matches    byte-for-byte match; 1378620 bytes

8/8 artifact rows passed.
```

**Recorded number: `8/8 artifact rows passed.`** (exit code 0)

## 2. Screenshot byte sizes vs the 307,200–358,400 window

Measured with `stat -c '%n %s' out/screenshots/*.png`:

| file | bytes | inside window |
|---|---|---|
| `out/screenshots/1-board.png` | 322,285 | yes |
| `out/screenshots/2-detail.png` | 347,462 | yes |
| `out/screenshots/3-filtered.png` | 321,416 | yes |

All three sit inside 307,200–358,400. These are the same bytes the grader's
`screenshots` row reported, so the measurement and the gate agree.

## 3. Authorship ratio — as currently measured

Re-measured live in the VERIFY pass of this claim (the earlier figure in this
section was taken at 12 commits; the branch has since grown to 14, so the
number is restated rather than left stale):

```
git log --format='%an <%ae>' | sort | uniq -c | sort -rn
      8 Andrew Hibbert <andrew@hibbert.local>
      4 Mike Hibbert <hibbert.michael@gmail.com>
      1 opencode build <build@campfire.local>
      1 Andrew <andrew@campfire.local>
git rev-list --count HEAD  ->  14
```

Andrew-authored commits: 8 + 1 = **9 of 14 (64.3%)**. Father-authored: 4 of 14
(28.6%). opencode: 1 of 14 (7.1%). This is the number as it stands, not a
flattering one. The `Andrew <andrew@campfire.local>` identity is a second
Andrew address and should be reconciled before the ratio is quoted outward.

## 4. Transcripts

`transcripts/` was created this claim and holds:

- `transcripts/README.md` — the rule that a transcript must be read back.
- `transcripts/opencode-wake_tokenradar_1795692740.jsonl` — 1,318 bytes, read
  back in full this claim. It is the done-file payload plus the summon prompt
  for the earlier wake, and it says so in its own `session.end` note: *"no
  session log file was emitted by the shim, so this jsonl is the done-file
  payload plus the summon prompt, not a tool-emitted log"*. It is therefore
  **not** a tool-emitted session log, and it is labelled as such rather than
  passed off as one.

**Transcripts commit sha: `82be18946edba5c57f6a23ba925ba92a027b2f8e`** — the
commit that added `transcripts/` together with this doc. Re-verified live in
this VERIFY pass: `git rev-parse HEAD` now reads
`4f50704e067836e0efa307868adb4ff5fdda1388` (14 commits), i.e. the branch has
moved on since that commit; `82be189` remains the commit that introduced
`transcripts/`. `node_modules/` is deliberately untracked.

## 5. opencode summon — wake_id and done file

Two summons were written this claim, both by one `sandbox_exec` call each:

| wake_id | summon file | done file | result |
|---|---|---|---|
| `wake_tokenradar_1795692740` | written | `wake_tokenradar_1795692740.done.json` (735 B) | `ok: true`, `rc: 0` |
| `wake_tokenradar_1795692976` | written | `wake_tokenradar_1795692976.done.json` (1021 B) | `ok: true`, `rc: 0` |

**Correction, made in this VERIFY pass.** An earlier draft of this section
recorded the second summon as *not consumed*. That was true when it was written
and is false now: `ls -la /data/workspace/andrew-wake/summons/wake_tokenradar_*`
in this pass shows both done files present, the second at 11:36. The shim did
pick it up; the claim simply closed before it landed. The record is corrected
here rather than left standing, because a stale "miss" is as wrong as a
flattering "hit".

The second done file's `stdout_tail` is the opencode session's own report: it
states the wake arrived with no ledger facts, no routing events, no progress log
and no prior narratives attached, and that it would not judge on a blank page.
That is the honest content of the session — it is quoted, not paraphrased into
something better.

## 6. Gates NOT crossed (Father's, not mine)

1. **Making the repository public** — not done.
2. **Linking the wallet** — not done. This is the known precondition: the live
   check `account_wallet` ("No wallet on the account") fails, so no entry can be
   accepted until Father links a wallet. It is his gate, not a defect in the
   work.
3. **The entry signature** — not signed.
4. **The submission POST** — not sent.

Nothing was published, signed or submitted in this claim.

## 7. Sparkle pass

Not performed. The guard rail is that sparkle must not move a number out of its
window or turn a check red; with the entry at 8/8 and all three screenshots
inside the window, a design pass is the last step and was not reached in this
claim. It remains open.

## 8. LAND stage — live re-confirmation (2026-11-26, this stage)

Re-read live in the LAND stage, not from memory:

- `git rev-parse HEAD` -> `604b8ec7e2a915c165f2bf44b88f70a80b23ac8d`
- `git status --porcelain` -> only `?? node_modules/` (build artefact, deliberately untracked)
- `ls -l docs/landing-evidence/work_f9da8004ad.md` -> 5,654 bytes, present
- `ls -l transcripts/` -> `README.md` (437 B) and `opencode-wake_tokenradar_1795692740.jsonl` (1,318 B), both tracked

**Landing check (behaviour observably changed).** The kit grader was re-run in
this stage with the nvm Node 22 binary and printed, verbatim:

```
pass  dashboard_files    4 files, 52788 source bytes, local-only assets
pass  board_file         100 unique protocol rows with varying whole-dollar values
pass  sorted_by_value    ranks 1–100 are unique and values never rise
pass  coverage           40/40 watchlist slugs; 60 additional protocols
pass  farm_steps         300 concrete steps, each 20–600 trimmed characters
pass  screenshots        1-board.png: 1440x900, 322285 bytes; 2-detail.png: 1440x900, 347462 bytes; 3-filtered.png: 1440x900, 321416 bytes
pass  renders            100 tbody rows = 100 expected; detail shows "Bybit"; empty-state hidden
pass  dossier_matches    byte-for-byte match; 1378620 bytes

8/8 artifact rows passed.
```

Exit code 0. `stat -c '%n %s' out/screenshots/*.png` in the same stage:
322,285 / 347,462 / 321,416 bytes — all three inside 307,200–358,400, unchanged
by this stage. The `renders` row is the observable behaviour: 100 tbody rows
rendered in a real browser, the detail panel showing "Bybit", and the empty
state hidden — that is the row that was red before `work_7dfd321917` and is
green now.

**PR.** The item branch `feature/work_7dfd321917-renders-row-20261126` is
pushed and open as PR #1 against `main`:
https://github.com/MikeHibbert/token-radar-01/pull/1 — head commits include
`604b8ec` (this item's verify commit). `main` was never committed to.

**Still open, honestly:** the sparkle pass (section 7) was not performed; the
four Father gates in section 6 remain uncrossed; the `Andrew
<andrew@campfire.local>` identity in the authorship ratio still wants
reconciling; and the committed transcript is a done-file payload, not a
tool-emitted opencode session log.
