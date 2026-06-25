# TIDE ledger marks update (Sunday runbook)

Use this when refreshing **`ledgerMarks`** in `public/data/tide/tide_airdrop.json` from new leaderboard exports.

Other buckets (`veBaoSnapshot`, `boosters`, `raise`) are left alone unless you update them separately.

---

## Pools and rules

| Source | Pool (TIDE) | Leaderboard export |
|--------|-------------|-------------------|
| Maiden voyage — Launch | **10,000,000** | `ledger-marks-leaderboard-maiden-voyage-launch.json` |
| Maiden voyage — Euro | **4,000,000** | `ledger-marks-leaderboard-maiden-voyage-euro.json` |
| Maiden voyage — Metals | **1,000,000** | `ledger-marks-leaderboard-maiden-voyage-metals.json` |
| Harbor marks (Anchor & Sail) | **10,000,000** | `ledger-marks-leaderboard-anchor-and-sail.json` |
| **Total** | **25,000,000** | |

**Weight field:** use `totalMarks` from each export (not `bonusMarks`).

**Per-pool pro-rata:**

```
walletPoolShare = poolTide × (wallet totalMarks in pool) / (sum of totalMarks in pool)
```

**Global adjustments** (applied after summing all four pools per wallet):

1. **Min floor:** any wallet with marks in any pool → at least **10 TIDE** `ledgerMarks`.
2. **40% cap:** no wallet receives more than **10,000,000 TIDE** (40% of 25M).
3. **Redistribution:** min floor and cap changes must keep the **25M total** — excess is redistributed pro-rata to wallets below the cap.

---

## Step 1 — Export fresh leaderboards

1. Open **`/ledger-marks`** in the app (staging or prod, whichever has final marks).
2. For each view, use **Download JSON**:
   - Maiden voyage → **Launch**
   - Maiden voyage → **Euro**
   - Maiden voyage → **Metals**
   - **Anchor & Sail** tab
3. Save the four files (default names are fine), e.g. in `~/Downloads/`:
   - `ledger-marks-leaderboard-maiden-voyage-launch.json`
   - `ledger-marks-leaderboard-maiden-voyage-euro.json`
   - `ledger-marks-leaderboard-maiden-voyage-metals.json`
   - `ledger-marks-leaderboard-anchor-and-sail.json`

---

## Step 2 — Preview before writing

From the repo root, run the script below with paths to your four exports.

It writes `tmp-ledger-cap40-both.csv` and prints top recipients. **Review the CSV before Step 4.**

```bash
cd /path/to/harbor-app-1

node scripts/tide-ledger-marks-allocate.mjs \
  --launch ~/Downloads/ledger-marks-leaderboard-maiden-voyage-launch.json \
  --euro ~/Downloads/ledger-marks-leaderboard-maiden-voyage-euro.json \
  --metals ~/Downloads/ledger-marks-leaderboard-maiden-voyage-metals.json \
  --harbor ~/Downloads/ledger-marks-leaderboard-anchor-and-sail.json \
  --preview-only
```

Check:

- Total ≈ **25,000,000** TIDE
- Top wallet capped at **10,000,000**
- Smallest positive allocation ≥ **10** (or 0 if no marks)
- Wallet count matches expectations (~58 last run)

---

## Step 3 — (Optional) Zero `ledgerMarks` first

Skip this if you use `--apply` in Step 4 — it overwrites every wallet’s `ledgerMarks` in one pass (0 for wallets not on the leaderboards).

Only clear the marks bucket; do **not** wipe veBAO / boosters / raise.

Quick check after:

```bash
node -e "
const j = require('./public/data/tide/tide_airdrop.json');
const sum = j.allocations.reduce((s,r) => s + (r.buckets.ledgerMarks?.amountTokens ?? 0), 0);
console.log('ledgerMarks sum:', sum, 'rows:', j.allocations.length);
"
```

Expect **`ledgerMarks sum: 0`**.

The apply script in Step 4 does this automatically if you pass `--apply`.

---

## Step 4 — Apply allocations to `tide_airdrop.json`

```bash
node scripts/tide-ledger-marks-allocate.mjs \
  --launch ~/Downloads/ledger-marks-leaderboard-maiden-voyage-launch.json \
  --euro ~/Downloads/ledger-marks-leaderboard-maiden-voyage-euro.json \
  --metals ~/Downloads/ledger-marks-leaderboard-maiden-voyage-metals.json \
  --harbor ~/Downloads/ledger-marks-leaderboard-anchor-and-sail.json \
  --apply
```

Updates made:

- `bucketPools.ledgerMarks` → `25000000`
- `description` — documents rules
- `addressCount` — refreshed
- Each row: `buckets.ledgerMarks.amountTokens` set; other buckets unchanged
- New leaderboard-only addresses appended (other buckets `0`)

Post-apply sanity check:

```bash
node -e "
const j = require('./public/data/tide/tide_airdrop.json');
const sum = j.allocations.reduce((s,r) => s + (r.buckets.ledgerMarks?.amountTokens ?? 0), 0);
const positive = j.allocations.filter(r => (r.buckets.ledgerMarks?.amountTokens ?? 0) > 0).length;
console.log({ sum: Math.round(sum), positive, addressCount: j.allocations.length });
"
```

Expect **`sum: 25000000`** (tiny float drift is ok).

---

## Step 5 — Clean up temp files

Remove generated previews from the repo root:

```bash
rm -f tmp-ledger-*.csv tmp-ledger-variants-summary.json tmp-cap40-compare.json
```

Do **not** commit `tmp-*` files. Leaderboard exports in `~/Downloads` can be archived locally if you want an audit trail.

---

## Step 6 — Verify in the app

1. `yarn dev`
2. Open the TIDE page and connect a few known wallets.
3. Confirm **Marks** bucket matches the preview CSV.
4. Spot-check that veBAO / boosters / raise were not reset.

---

## Appendix — Script source

Full implementation: [`scripts/tide-ledger-marks-allocate.mjs`](../scripts/tide-ledger-marks-allocate.mjs)

Flags:

| Flag | Description |
|------|-------------|
| `--launch`, `--euro`, `--metals`, `--harbor` | Paths to the four leaderboard JSON exports |
| `--preview-only` | Write `tmp-ledger-cap40-both.csv` only |
| `--apply` | Update `tide_airdrop.json` (zeros `ledgerMarks` for wallets not on leaderboards) |
| `--airdrop <path>` | Optional; default `public/data/tide/tide_airdrop.json` |

---

## Related files

| File | Purpose |
|------|---------|
| `public/data/tide/tide_airdrop.json` | Source of truth for TIDE airdrop UI |
| `src/app/ledger-marks/page.tsx` | Leaderboard + **Download JSON** |
| `src/utils/ledgerMarksLeaderboardExport.ts` | Export shape (`totalMarks`, full addresses) |
| `src/config/tide.ts` | Bucket keys and data path |
| `tmp-ledger-cap40-both.csv` | Last approved preview (gitignored / delete after use) |
