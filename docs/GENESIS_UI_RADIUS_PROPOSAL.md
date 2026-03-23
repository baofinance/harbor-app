# Proposal: straight vs rounded edges (Genesis page + wallet)

**Goal:** Decide where you want **sharp corners** (0–2px), **soft corners** (6–8px, ~`rounded-md` / `rounded-lg`), or **pills** (`rounded-full`) so the page feels consistent with the **header** (already aligned: white `rounded-md` chips + blue text).

**Visual preview:** open [`genesis-ui-radius-preview.html`](./genesis-ui-radius-preview.html) in a browser (double-click or `open docs/genesis-ui-radius-preview.html`) — static HTML reflecting **§7 Applied** (segmented Genesis filter, soft `md` deck, modals, Account network rows, etc.). An A/B/C radius-only strip remains at the bottom for historical reference.

---

## 1. Where the app is today (from current UI)

| Zone | Typical classes / shape | Notes |
|------|-------------------------|--------|
| **Header (nav)** | `rounded-md`, white fill on active | Baseline “Harbor chrome” |
| **UI− / UI+** | Segmented control, `rounded-md` track | Matches nav |
| **Wallet (closed)** | `rounded-md` white chip | Matches nav active tab |
| **Intro hero cards** | `rounded-none` on cards | Glass panels, **sharp** |
| **Ledger marks bar** | Mostly sharp rectangles | Dark bar |
| **Warning / error banners** | `rounded-none` or light radius | **Sharp** |
| **Toolbar** | Active campaign + Ongoing + **pills** (`rounded-full`) | Strong contrast vs table |
| **Network filter** | White dropdown, **sharp** | |
| **Table header row** | White bar, **sharp** | |
| **Market rows** | White, **sharp** | |
| **Manage / Claim** | `rounded-full` | Pills |
| **Genesis Manage modal** | Modal outer **sharp**; some inner fields **rounded** | Mixed |
| **Wallet modal** | Outer **~8px** radius; **pill** rows + Disconnect | “Modal language” |

So today you already have **three families:** (A) sharp containers, (B) soft nav-style chips, (C) full pills for CTAs.

---

## 2. Design directions (pick per zone)

### A. “One system” — **radius tokens**

Define 2–3 tokens and apply everywhere (except true pills):

| Token | Tailwind-ish | Use for |
|-------|----------------|--------|
| **R0** | `rounded-none` | Tables, stats bars, banners, modal **shell** |
| **R1** | `rounded-md` (6px) | Header controls, wallet, segmented toggles, **inputs** |
| **R2** | `rounded-full` | Only **primary/secondary CTAs** in content (Manage, Claim, campaign pills) |

**Pros:** Predictable. **Cons:** Tables stay sharp while buttons stay round — intentional hierarchy.

### B. “Modal-first” — **wallet + header echo Wallet modal**

You said you want the **closed wallet** to feel closer to the **Wallet modal**:

- Modal = **dark blue panels**, **rounded-lg** outer shell, **pill** list rows, **pill** Disconnect.
- **Proposal for header wallet (closed state):**
  - **Option B1 — Mini panel:** `bg-[#153A5F]` or `bg-[#17395F]`, `border border-white/15`, `rounded-lg`, **white/90 text**, **no** white fill — reads as “modal chrome” not “nav tab”.
  - **Option B2 — Hybrid:** Outer **dark** `rounded-lg` strip; inner address as **pill** `rounded-full bg-white/10` (mirrors network rows inside modal).
  - **Option B3 — Keep white chip** but add **rounded-lg** + subtle border `ring-1 ring-white/30` so it’s not identical to nav tabs — still “light” but closer to modal card contrast.

**Recommendation to try first:** **B1** or **B2** on desktop only; keep mobile readable.

### C. “Table-first” — **sharpen toolbar to match table**

- Change **MEGAETH** / **Ongoing** / **Ledger Marks** from `rounded-full` → **`rounded-md`** so the filter row visually matches the **white table** strip (straight edges).
- **Pros:** One horizontal “dashboard band” with consistent corners. **Cons:** Loses playful “pill” campaign look.

### D. “Softer content” — **round the big cards only**

- Intro **three** cards: `rounded-lg` + thin border (instead of `rounded-none`).
- Table rows stay **sharp** (data density).
- **Pros:** Hero feels card-like; **Cons:** Slightly different from table.

---

## 3. Zone-by-zone recommendation (for your review)

Use this to **tick** what you prefer. Implementation is a follow-up pass.

| # | Zone | Straight / sharp | Soft (`md`/`lg`) | Pill | Suggested default |
|---|------|-------------------|------------------|------|-------------------|
| 1 | Header nav + UI−/+ + wallet (current) | | ✓ | | Keep **soft** — already unified |
| 2 | Closed wallet → “modal-like” | | ✓ (B1/B2) | inner optional | **Try dark panel** (see §2B) |
| 3 | Intro hero 3 cards | ✓ | optional | | **Sharp** today; **or** `rounded-lg` (§2D) |
| 4 | Ledger marks stats bar | ✓ | | | **Sharp** (match table) |
| 5 | Error / warning banners | ✓ | | | **Sharp** |
| 6 | Toolbar: campaign pill | | | ✓ | **Pill** keeps emphasis **or** `rounded-md` (§2C) |
| 7 | Toolbar: Ongoing / All | | ✓ | ✓ today | Align with **#6** choice |
| 8 | Network multiselect trigger | ✓ | ✓ | | **Sharp** or **md** to match dropdown panel |
| 9 | Ledger Marks badge | | | ✓ | Often **pill**; could be **md** |
| 10 | Table header | ✓ | | | **Sharp** |
| 11 | Market row container | ✓ | | | **Sharp** |
| 12 | Status chips | | | ✓ | **Pill** keeps scannable |
| 13 | Manage / Claim | | | ✓ | **Pill** (CTA) |
| 14 | Genesis deposit modal | ✓ shell | inner fields ✓ | CTA | Align modal **shell** to **R0** or **R1** once chosen |
| 15 | Wallet modal | ✓ outer | pills inside | — | Already **modal language**; header wallet should **reference** this |

---

## 4. Implementation note (when you decide)

- Centralize radii in **`globals.css`** as CSS variables, e.g. `--radius-chrome: 0.375rem`, `--radius-surface: 0`, `--radius-cta: 9999px`, then map Tailwind or component classes once.
- **Anchor / Sail:** After Genesis choices are locked, copy the same token table into [`INDEX_PAGE_PATTERN.md`](./INDEX_PAGE_PATTERN.md) § “Design tokens”.

---

## 5. Files touched when you implement (not now)

| Area | Likely files |
|------|----------------|
| Wallet closed | `Account.tsx`, `Wallet.tsx` |
| Toolbar | `GenesisMarketsToolbar.tsx`, `LedgerMarksCompactBadge`, filter dropdown |
| Hero | `GenesisHeroIntroCards.tsx` |
| Stats / banners | `GenesisCampaignStats.tsx` |
| Table / rows | `page.tsx` (many classes), `GenesisMarketRowClaimActions.tsx` |
| Modals | `GenesisManageModal`, `Account` modal, `Wallet` modal |

---

## 6. Next step

1. Open **`docs/genesis-ui-radius-preview.html`** and compare **A / B / C** blocks.
2. Mark preferences in §3 (or reply with “table sharp, toolbar md, wallet B2”, etc.).
3. We apply one token pass in a single PR.

---

## 7. Applied (March 2026)

Aligned with the preview + decisions:

- **Intro hero cards** — `rounded-md` ([`GenesisHeroIntroCards.tsx`](../src/components/genesis/GenesisHeroIntroCards.tsx)).
- **Ledger bar + error/warning surfaces** — `rounded-md` ([`GenesisLedgerMarksSummary.tsx`](../src/components/GenesisLedgerMarksSummary.tsx), [`GenesisErrorBanner.tsx`](../src/components/GenesisErrorBanner.tsx), [`GenesisCampaignStats.tsx`](../src/components/genesis/GenesisCampaignStats.tsx) subgraph strip).
- **Toolbar + ledger badge + network filter** — soft `rounded-md` ([`GenesisMarketsToolbar.tsx`](../src/components/genesis/GenesisMarketsToolbar.tsx), [`LedgerMarksCompactBadge.tsx`](../src/components/LedgerMarksCompactBadge.tsx), [`FilterMultiselectDropdown.tsx`](../src/components/FilterMultiselectDropdown.tsx)). **Genesis: Ongoing / All** — same classes as [`PageLayoutToggle`](../src/components/PageLayoutToggle.tsx) (`rounded-md` track `bg-white/10`, inner `rounded`, active `bg-white text-[#1E4775] shadow-sm`, inactive `text-white hover:bg-white/20`); `py-2 text-sm` to align with Network dropdown trigger.
- **Table header + market rows (active / coming soon / completed)** — `rounded-md` on white deck strips ([`src/app/genesis/page.tsx`](../src/app/genesis/page.tsx)).
- **Manage / Claim** — `rounded-md` ([`GenesisMarketRowClaimActions.tsx`](../src/components/genesis/GenesisMarketRowClaimActions.tsx)).
- **Wallet modal** — `rounded-lg` shell, `#153A5F` header strip, close control + list rows aligned with Account modal ([`Wallet.tsx`](../src/components/Wallet.tsx)); Account shell also `rounded-lg` ([`Account.tsx`](../src/components/Account.tsx)).
- **Account modal (connected wallet)** — inner controls use `rounded-md`: Copy, Balance panel, network rows, Disconnect; **current** network row is **`bg-white`** + `ring-2 ring-[#1E4775]/40` + shadow; other rows **`bg-gray-300`** + hover (stronger contrast vs white) ([`Account.tsx`](../src/components/Account.tsx)).
- **Closed wallet chip** — unchanged white `rounded-md` (nav match).
- **Genesis deposit / withdraw** — shared [`DepositModalShell`](../src/components/DepositModalShell.tsx) panel default **`rounded-md`** (Genesis deposit & withdraw no longer force `rounded-none`).
- **Genesis Manage modal** (Deposit / Withdraw tabs) — outer white shell **`rounded-md`** ([`GenesisManageModal.tsx`](../src/components/GenesisManageModal.tsx)).
- **Expanded market** (row expand) — outer panel + inner cards / APR strip **`rounded-md`** ([`GenesisMarketExpandedView.tsx`](../src/components/GenesisMarketExpandedView.tsx)).
