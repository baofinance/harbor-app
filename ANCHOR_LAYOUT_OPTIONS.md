# Anchor Page Layout Options

## Current Issues
- Users can mint ha tokens from multiple markets
- Each ha token has 2 stability pools (collateral + sail)
- Users need to choose where to deposit after minting
- Too many clicks to complete common flows
- Need to batch transactions (mint + deposit)

## Option 1: Smart Action Button with Inline Pool Selection ⭐ (RECOMMENDED)

### Layout
- Each market card has a single **"Mint & Deposit"** button
- Button opens modal with:
  - **Step 1**: Mint amount input + stability pool selection (collateral/sail) in one view
  - **Step 2**: Confirm and execute (batches mint + deposit)
- For users who already have ha tokens: Show **"Deposit"** button next to "Mint & Deposit"
- Quick actions on card: "Withdraw" and "Redeem" buttons

### Pros
- ✅ Batches mint + deposit in one transaction flow
- ✅ Reduces clicks (2 clicks: open modal → confirm)
- ✅ Clear visual hierarchy
- ✅ Pool selection is part of mint flow, not separate
- ✅ Handles both new mints and existing token deposits

### Cons
- ⚠️ Modal might be slightly more complex
- ⚠️ Need to handle "mint only" vs "mint + deposit" cases

### Visual Structure
```
┌─────────────────────────────────────┐
│ haETH Market Card                   │
│ APR: 5.2% / 3.1%                   │
│ Rewards: $12.50                     │
│                                     │
│ [Mint & Deposit] [Deposit] [Withdraw] [Redeem]
└─────────────────────────────────────┘
```

---

## Option 2: Two-Button Approach with Quick Actions

### Layout
- **Primary button**: "Mint & Deposit" (batches both)
- **Secondary button**: "Deposit" (for existing ha tokens)
- Both buttons open same modal, but pre-select appropriate tab
- Inline pool selection within the modal

### Pros
- ✅ Clear separation of use cases
- ✅ Still batches mint + deposit
- ✅ Easy to understand

### Cons
- ⚠️ Two buttons might be confusing
- ⚠️ More visual clutter

---

## Option 3: Unified "Action" Button with Smart Defaults

### Layout
- Single **"Action"** button per market
- Button text changes based on user state:
  - No ha tokens: "Mint & Deposit"
  - Has ha tokens: "Deposit" or "Manage"
- Modal opens with smart defaults:
  - If no tokens: Start on "Mint" tab with "Deposit in pool" checked
  - If has tokens: Start on "Deposit" tab

### Pros
- ✅ Cleanest UI (one button)
- ✅ Smart defaults reduce clicks
- ✅ Adapts to user state

### Cons
- ⚠️ Button text changes might be confusing
- ⚠️ Less explicit about available actions

---

## Option 4: Inline Pool Cards on Market Card

### Layout
- Market card shows both stability pools as sub-cards
- Each pool card has:
  - Pool type (collateral/sail) with APR
  - "Mint & Deposit" button
  - Current deposit amount
- Main market card has "Mint Only" option

### Pros
- ✅ Very clear which pools are available
- ✅ Can see all options at once
- ✅ Direct action per pool

### Cons
- ⚠️ More visual complexity
- ⚠️ Cards might get cluttered
- ⚠️ Harder to scan multiple markets

### Visual Structure
```
┌─────────────────────────────────────┐
│ haETH Market                        │
│                                     │
│ ┌─────────────┐  ┌─────────────┐   │
│ │ Collateral  │  │ Sail Pool   │   │
│ │ APR: 5.2%   │  │ APR: 3.1%   │   │
│ │ [Mint & Dep]│  │ [Mint & Dep]│   │
│ └─────────────┘  └─────────────┘   │
│                                     │
│ [Mint Only] [Withdraw] [Redeem]    │
└─────────────────────────────────────┘
```

---

## Option 5: Tabbed Modal with Pool Selection in Mint Tab

### Layout
- Keep current "Manage" button
- Modal has tabs: Mint, Deposit, Withdraw, Redeem
- **Mint tab** includes:
  - Amount input
  - Checkbox: "Deposit in stability pool"
  - If checked: Pool type selector (Collateral/Sail)
  - Single "Mint & Deposit" button (batches both)
- **Deposit tab**: For existing ha tokens

### Pros
- ✅ Familiar tab structure
- ✅ Batches mint + deposit
- ✅ Clear separation of actions
- ✅ Easy to add more options later

### Cons
- ⚠️ Still requires opening modal
- ⚠️ One extra click vs inline options

---

## Recommendation: Option 1 (Smart Action Button)

**Why:**
1. **Batches transactions**: Mint + deposit in one flow
2. **Reduces clicks**: 2 clicks total (open modal → confirm)
3. **Clear intent**: "Mint & Deposit" is explicit
4. **Flexible**: Still supports "mint only" via unchecked box
5. **Scalable**: Easy to add more pool options later

**Implementation Details:**
- Modal opens on "Mint" tab by default
- "Deposit in stability pool" checkbox is checked by default
- Pool type selector (Collateral/Sail) appears when checkbox is checked
- Single "Mint & Deposit" button executes both transactions
- For users with existing ha tokens, show secondary "Deposit" button

**Modal Flow:**
```
1. User clicks "Mint & Deposit"
2. Modal opens → Mint tab (default)
3. User enters amount
4. "Deposit in stability pool" is checked (default)
5. User selects pool type (Collateral/Sail)
6. User clicks "Mint & Deposit"
7. Transaction batches: approve → mint → deposit
```

---

## Additional Considerations

### For Multiple Markets:
- Each market is independent
- Users can mint from multiple markets
- Each market's ha token can only go to its own 2 pools
- No cross-market pool confusion

### For Future Scalability:
- If ha tokens can go to pools from other markets, add:
  - Pool selector dropdown showing all compatible pools
  - Group by market for clarity
  - Show APR for each option

### Transaction Batching:
- Always batch: approve → mint → deposit
- Show transaction preview before confirmation
- Display expected output (ha tokens + pool deposit)






