# Simple View Proposal for Anchor Page

## Overview
Create a toggle between "Simple" and "Advanced" views. Current view becomes "Advanced". Simple view groups similar ha tokens and provides a streamlined flow.

## Simple View Design

### 1. View Toggle
- **Location**: Top right of header section (next to title)
- **Toggle**: "Simple" / "Advanced" switch
- **Default**: Advanced (current view)
- **Persistence**: Save preference in localStorage

### 2. Token Grouping
Group markets by `peggedToken.symbol`:
- **haETH**: Combine all haETH markets (currently: USD/ETH)
- **haBTC**: Combine all haBTC markets (currently: USD/BTC, ETH/BTC)

### 3. Combined Display Logic
For each grouped token, show:
- **Combined APR**: Average or best APR across all markets
- **Combined Rewards**: Sum of all rewards across markets
- **Combined Position**: Total position across all markets
- **Best Market**: Auto-select market with highest APR (or most TVL)

### 4. Super Simple Flow

#### Option A: Single "Deposit" Button (RECOMMENDED)
```
┌─────────────────────────────────────┐
│ haBTC                                │
│ Earn up to 4.2% APR                 │
│ Your Position: $1,250               │
│                                     │
│ [Deposit]                           │
└─────────────────────────────────────┘
```

**Flow:**
1. User clicks "Deposit"
2. Modal opens with:
   - Amount input (collateral token)
   - Auto-selected: Best market (highest APR)
   - Auto-selected: Best pool (collateral or sail, whichever has higher APR)
   - Single "Deposit" button
3. User enters amount → Clicks "Deposit"
4. Transaction batches: approve → mint → deposit

**Pros:**
- ✅ Minimal choices (just amount)
- ✅ Auto-optimizes for best yield
- ✅ Simple language ("Deposit" not "Mint & Deposit")
- ✅ One button, one action

**Cons:**
- ⚠️ User can't choose market/pool
- ⚠️ Might deposit to different market than expected

---

#### Option B: Two-Step with Auto-Select
```
┌─────────────────────────────────────┐
│ haBTC                                │
│ Earn up to 4.2% APR                 │
│ Your Position: $1,250               │
│                                     │
│ [Quick Deposit] [Choose Options]    │
└─────────────────────────────────────┘
```

**Flow:**
- **Quick Deposit**: Auto-selects best market + pool
- **Choose Options**: Opens advanced modal with all choices

**Pros:**
- ✅ Still simple for most users
- ✅ Advanced users can customize

**Cons:**
- ⚠️ Two buttons might be confusing
- ⚠️ More clicks for advanced users

---

#### Option C: Smart Defaults with Override
```
┌─────────────────────────────────────┐
│ haBTC                                │
│ Best APR: 4.2% (Collateral Pool)    │
│ Your Position: $1,250               │
│                                     │
│ [Deposit] [More Options]            │
└─────────────────────────────────────┘
```

**Flow:**
- **Deposit**: Uses best market + pool (auto-selected)
- **More Options**: Shows dropdown to choose market/pool

**Pros:**
- ✅ Clear what will happen
- ✅ Easy to override if needed

**Cons:**
- ⚠️ Still requires understanding of options

---

## Recommended: Option A (Single Deposit Button)

### Implementation Details

#### Simple View Card Structure
```
┌─────────────────────────────────────────────┐
│ haBTC                                        │
│ ─────────────────────────────────────────── │
│ APR: 4.2% (best across all markets)         │
│ Rewards: $25.50 (combined)                   │
│ Position: $1,250 (combined)                  │
│                                              │
│ [Deposit]                                    │
└─────────────────────────────────────────────┘
```

#### Modal Flow (Simple View)
1. **Amount Input**
   - Show: "How much do you want to deposit?"
   - Input: Collateral amount (auto-detect which collateral based on best market)
   - Balance: Show available collateral balance

2. **Auto-Selection (Hidden from user)**
   - Select market with highest APR
   - Select pool (collateral or sail) with highest APR
   - Calculate expected output

3. **Preview**
   - "You'll receive: X haBTC"
   - "Deposited to: [Best Pool] (4.2% APR)"
   - Small text: "Optimized for best yield"

4. **Action Button**
   - "Deposit" (batches approve → mint → deposit)

#### Key Simplifications
- ❌ No market selection
- ❌ No pool selection (collateral/sail)
- ❌ No "Mint" vs "Deposit" distinction
- ❌ No multiple buttons
- ✅ Just: Amount → Deposit
- ✅ Auto-optimizes for yield
- ✅ Simple language throughout

---

## Advanced View (Current)
- Shows all markets separately
- Multiple action buttons
- Full control over market/pool selection
- All current functionality

---

## Implementation Checklist

### Simple View
- [ ] Add view toggle in header
- [ ] Group markets by peggedToken.symbol
- [ ] Calculate combined stats (APR, rewards, position)
- [ ] Auto-select best market (highest APR)
- [ ] Auto-select best pool (highest APR)
- [ ] Simplify modal for simple view
- [ ] Hide pool/market selection in simple modal
- [ ] Update button text to "Deposit"
- [ ] Add "Optimized for best yield" indicator

### Advanced View
- [ ] Keep current structure
- [ ] Ensure toggle works correctly
- [ ] Persist preference

### Shared
- [ ] Ensure both views use same underlying contracts
- [ ] Handle edge cases (no markets, no pools, etc.)
- [ ] Update rewards section to work with both views

---

## Edge Cases

1. **Multiple markets with same APR**
   - Select market with highest TVL
   - Or most recent market

2. **No pools available**
   - Show message: "No pools available for this token"
   - Disable deposit button

3. **User has existing deposits in multiple markets**
   - Show combined position
   - In simple view, new deposits go to best market
   - In advanced view, user can choose

4. **Different collaterals for same ha token**
   - Auto-select market based on user's available collateral
   - Or show which collateral is needed

---

## User Testing Questions
1. Do users understand "Deposit" means mint + deposit?
2. Are users comfortable with auto-selection?
3. Do they want to see which market/pool was selected?
4. Should we show a tooltip explaining auto-selection?





















