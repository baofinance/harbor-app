# Dashboard Portfolio Components (Phase 2)

Reusable building blocks for the card-based dashboard layout.

## Components

### `PortfolioMetricCard`
Category summary tile — value, position count, accent strip, icon.
**Used for:** Earn, Sail, Archived summary row (`DashboardCategorySummaryCards`).

### `PositionCard`
Compact position card with market icon, type, value, status badge, and Manage action.
**Used for:** Earn, Sail, Maiden Voyage, and Archived positions (`DashboardPositionsList`).

### `YieldSharePositionCard`
Yield-share market card with ownership %, boost, pool share, paid, and pending distribution.
**Used for:** Expanded yield share section (`DashboardYieldShareCardList`).

### `InsightCard`
Label + primary value + optional subvalue for at-a-glance portfolio facts.
**Used for:** Largest position, highest earner, primary market (`DashboardPortfolioInsights`).

### `StatusBadge`
Contextual status pill with variants: `active`, `ended`, `neutral`, `coral`, `gold`, `purple`, `green`.
**Used for:** Position cards, yield share summary, voyage widget.

### `DashboardEmptyState`
Structured empty state with title, message, position count, and CTA link.
**Used for:** All position sections and yield share details.

## Widgets

| Component | Purpose |
|-----------|---------|
| `DashboardPortfolioHero` | Total value, earned, pending distribution (Phase 1) |
| `DashboardYieldShareSummaryCard` | Top-level yield share snapshot |
| `DashboardMaidenVoyageWidget` | Active voyage status + capacity bar |
| `DashboardPortfolioAllocation` | Segmented allocation bars |
| `DashboardPortfolioInsights` | Insight card row |

## Utilities

`dashboardPortfolioUtils.ts` — allocation slices, insights, yield aggregation, position label helpers.

`portfolioStyles.ts` — shared grid, card shell, and accordion animation tokens.
