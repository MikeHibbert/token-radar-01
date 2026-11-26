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

Measured with `git log --format='%an <%ae>' | sort | uniq -c | sort -rn` over
12 commits on this branch:

```
6 Andrew Hibbert <andrew@hibbert.local>
4 Mike Hibbert <hibbert.michael@gmail.com>
1 opencode build <build@campfire.local>
1 Andrew <andrew@campfire.local>
```

Andrew-authored commits: 6 + 1 = **7 of 12 (58.3%)**. Father-authored: 4 of 12
(33.3%). opencode: 1 of 12 (8.3%). This is the number as it stands, not a
flattering one — the entry is not yet majority-Andrew by a wide margin, and the
`Andrew <andrew@campfire.local>` identity is a second Andrew address that should
be reconciled before the ratio is quoted anywhere outward.

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

**Transcripts commit sha: not yet available.** `transcripts/` is still
untracked at the time of writing (`git status --short` shows `?? transcripts/`).
The sha is filled in by the commit that follows this doc; until that commit
exists, no sha is claimed here.

## 5. opencode summon — wake_id and done file

Summon written this claim:

```
/data/workspace/andrew-wake/summons/wake_tokenradar_1795692976.json
```

- `wake_id`: `wake_tokenradar_1795692976`
- `source`: `andrew_request`, `visible`: `0`
- **Done file: NOT PRESENT.** `ls` of
  `/data/workspace/andrew-wake/summons/wake_tokenradar_1795692976.done.json`
  returned *"No such file or directory"* on two separate checks, several
  minutes apart. The shim did not consume this summon within the window of this
  claim.

The earlier summon `wake_tokenradar_1795692740` **did** complete (`ok: true`,
`rc: 0`), and its payload is the jsonl in `transcripts/`. So the channel works;
this particular summon was simply not picked up before the claim closed. That
is reported as a miss, not smoothed over.

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
