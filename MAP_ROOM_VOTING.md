# Map Room Voting System

## Overview
The Map Room voting feature allows users to allocate vote points across price feeds to help the Harbor team decide which markets to launch next.

## How It Works (User-Facing)

### Basic Mechanics
- **Each wallet gets 5 vote points** to allocate across any price feeds
- **Votes are global** — the same 5 points work across all chains (Ethereum, Arbitrum, Base, etc.)
- **You can change your votes anytime** — simply click "Vote" on a feed and adjust your allocation
- **No gas fees** — voting uses wallet signatures (EIP-712), not on-chain transactions

### User Experience
1. **Connect your wallet** to enable voting
2. **View vote totals** — each feed shows:
   - Total community votes (sum of all users' allocations)
   - Your current allocation (shown in parentheses on the "Vote" button)
3. **Allocate points** — click "Vote" on any feed to open the allocation modal
4. **Adjust allocations** — use the slider or input to set points (0-5 per feed)
5. **Submit** — sign the message with your wallet to save your votes
6. **Track usage** — the top bar shows "X/5 used" across all your allocations

### Visual Indicators
- **"Vote" button** shows your current allocation: `Vote (2)` means you've allocated 2 points
- **Total votes** are displayed next to each feed's vote button
- **Remaining points** are shown in the tooltip when hovering over vote buttons
- **Disabled state** — vote buttons are grayed out if wallet is not connected

---

## Technical Details (Team Documentation)

### Architecture
- **Storage**: Off-chain (Upstash Redis REST API in production, in-memory fallback for dev)
- **Authentication**: EIP-712 typed data signatures (no on-chain transactions)
- **Security**: Nonce-based replay protection (one-time use per signature)

### Data Flow
1. **User clicks "Vote"** → Modal opens with current allocation
2. **User adjusts points** → Frontend validates total ≤ 5 points
3. **User submits** → Frontend requests nonce from `/api/votes/nonce`
4. **Frontend builds EIP-712 message** → Includes voter address, nonce, allocations array
5. **Wallet signs message** → User approves signature in wallet
6. **Frontend POSTs to `/api/votes`** → Includes signature, nonce, allocations
7. **Backend verifies signature** → Uses `viem.verifyTypedData()`
8. **Backend consumes nonce** → Prevents replay attacks
9. **Backend stores allocations** → Updates Redis with new vote totals
10. **Frontend refreshes** → Shows updated totals and user allocations

### API Endpoints

#### `GET /api/votes`
- **Query params**: `feedIds` (comma-separated), `address` (optional)
- **Returns**: `{ totals: Record<string, number>, allocations?: Record<string, number> }`
- **Purpose**: Fetch vote totals for feeds and (if address provided) user's allocations

#### `POST /api/votes`
- **Body**: `{ voter: Address, nonce: string, signature: string, allocations: VoteAllocation[] }`
- **Returns**: `{ totals: Record<string, number>, allocations: Record<string, number> }`
- **Purpose**: Save new vote allocations (requires valid EIP-712 signature)

#### `GET /api/votes/nonce`
- **Query params**: `address`
- **Returns**: `{ nonce: string }`
- **Purpose**: Get a unique nonce for signature generation (prevents replay attacks)

### Vote Data Structure
```typescript
type VoteAllocation = {
  feedId: string;  // Format: "{network}-{feedAddress}"
  points: number;  // Integer 1-5
}

const VOTE_POINTS_MAX = 5;  // Per wallet, global across all chains
```

### Security Features
- **EIP-712 signatures**: Cryptographic proof of vote ownership
- **Nonce system**: Each vote submission requires a unique nonce (prevents replay)
- **Signature verification**: Backend validates signatures match the voter address
- **Point limits**: Frontend and backend enforce max 5 points per wallet
- **Normalization**: Allocations are sorted and deduplicated before storage

### Storage Schema (Redis)
- **Key pattern**: `votes:allocations:{address}` → JSON object of `{ feedId: points }`
- **Key pattern**: `votes:nonce:{address}` → Current nonce string
- **Totals calculation**: Aggregated on-demand from all stored allocations

### Frontend Components
- **`VoteCell`**: Displays total votes and "Vote" button for each feed
- **Vote Modal**: Slider/input for allocating points (0-5)
- **Vote Summary Bar**: Shows "X/5 used" at top of feed list
- **Real-time updates**: React Query refetches votes every 15 seconds

### Error Handling
- **Wallet not connected**: Vote buttons disabled, tooltip shows "Connect wallet to vote"
- **Invalid signature**: Backend returns 401, frontend shows error
- **Reused nonce**: Backend rejects, frontend requests new nonce and retries
- **Exceeds 5 points**: Frontend validation prevents submission
- **Network errors**: Frontend shows error state, allows retry

---

## Use Cases
- **Community input**: Gather user preferences for which markets to prioritize
- **Market research**: Identify high-demand price feeds before launching markets
- **Engagement**: Give users a voice in product direction
- **Data collection**: Aggregate voting data to inform launch decisions

---

## Future Enhancements (Potential)
- Vote history/analytics dashboard
- Weighted voting (e.g., based on user's TVL or marks)
- Time-limited voting periods
- Vote delegation
- On-chain voting option (for transparency/immutability)

