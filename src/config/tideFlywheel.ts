import { TIDE_CONFIG } from "@/config/tide";
import { TREASURY_SAFE_ADDRESS } from "@/config/treasury";

/** Default maiden-voyage owner share (bps) used to gross-up pool revenue. */
export const MAIDEN_VOYAGE_YIELD_OWNER_SHARE_BPS = 500;

export const TIDE_FLYWHEEL_CONFIG = {
  tideTokenAddress: TIDE_CONFIG.tideTokenAddress,
  /** Set when treasury POL LP is known (Uniswap V2 pair); null if using v4 POL config. */
  polLpAddress: null as `0x${string}` | null,
  /** Uniswap v4 POL pool — treasury concentrated liquidity positions. */
  polV4: {
    poolId:
      "0x7c2a7ae6e86055412f6e2663797fcf77d669b9671cd016fe7230883e1a627196" as `0x${string}`,
    positionManagerAddress:
      "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e" as `0x${string}`,
    stateViewAddress:
      "0x7ffe42c4a5deea5b0fec41c94c136cf115597227" as `0x${string}`,
    /** Scan from Uniswap v4 mainnet deployment block. */
    positionScanFromBlock: 21_600_000,
    uniswapPoolUrl:
      "https://app.uniswap.org/explore/pools/ethereum/0x7c2a7ae6e86055412f6e2663797fcf77d669b9671cd016fe7230883e1a627196",
  },
  treasuryAddress: TREASURY_SAFE_ADDRESS,
  tideDecimals: TIDE_CONFIG.tideDecimals,
  chainId: TIDE_CONFIG.chainId,
  targets: {
    treasuryOwnershipPct: 30,
    polOwnershipPct: 15,
  },
  buybackShareOfRevenuePct: 25,
  /** Buybacks are ongoing — no cumulative cap (25% of revenue per period). */
  buybackHasCap: false,
  /** Static until buyback indexing exists. */
  staticBuyback: {
    tideTokens: 0,
    /** If 0, derived from estimated revenue × buybackShareOfRevenuePct in hook. */
    usd: 0,
  },
  /**
   * Burn sink for on-chain supply-burned reads — TIDE sent here is treated as burned.
   * Standard ERC20 burn destination on Ethereum mainnet.
   */
  burnAddress:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
  /** Static until burn indexing exists. */
  staticBurn: {
    /** Whole-percent display when on-chain burn read is unavailable. */
    supplyBurnedPct: 0,
    /** Optional wei-scale override; used with totalSupply when token is configured. */
    tideTokensBurned: 0,
  },
  copy: {
    sectionTitle: "Protocol Revenue Journey",
    sectionSubtitle:
      "Every dollar earned by Harbor strengthens the TIDE ecosystem through a long-term capital allocation strategy.",
    revenueHero: {
      label: "Protocol Revenue Generated",
      tagline: "Every dollar strengthens TIDE with BUYBACKS",
    },
    revenueSplit: {
      reinvest: {
        pct: 75,
        label: "Reinvest",
        description: "Reinvested as stability pool yield to grow markets",
        yieldLabel: "Yield for:",
        activeMarkets: ["haETH", "haBTC", "haUSD"],
        inactiveMarkets: ["haGOLD", "haSILVER", "haOIL", "haSPX"],
      },
      strengthenTide: {
        pct: 25,
        label: "Strengthen TIDE",
        description: "Strengthen TIDE with buybacks",
        destinations: ["Treasury", "POL", "Burn"],
      },
    },
    timelineEntryLabel: "Revenue",
    stages: {
      buyback: {
        title: "Buy Back TIDE",
        description:
          "Protocol revenue purchases TIDE from the open market.",
        statLabel: "Total Purchased",
        statusComplete: "Complete",
        statusActive: "Active",
      },
      treasury: {
        title: "Treasury Target",
        description:
          "Purchased TIDE is retained until Treasury owns 30% of total supply.",
        currentLabel: "Current",
        targetLabel: "Target",
        targetReached: "Target Reached",
      },
      pol: {
        title: "Protocol-Owned Liquidity",
        description:
          "Once Treasury reaches 30%, future buybacks build permanent liquidity.",
        currentLabel: "Current POL",
        targetLabel: "Target",
        viewPoolLabel: "View POL pool",
        pendingConfig: "Pending LP configuration",
      },
      burn: {
        title: "Burn TIDE",
        description:
          "After POL reaches 15%, future buybacks are permanently burned.",
        currentLabel: "Current Burned",
      },
    },
    allocation: {
      title: "Current Revenue Allocation",
      todayLabel: "Today",
      futureLabel: "Future destination",
    },
    education: {
      howRevenueFlows: {
        title: "How Revenue Flows",
        paragraphs: [
          "Protocol revenue purchases TIDE from the open market.",
          "Until Treasury reaches 30% ownership, purchased tokens are retained by the Treasury.",
          "After the Treasury target is reached, all future buybacks build Protocol-Owned Liquidity.",
          "Once liquidity reaches 15% of supply, every future buyback is permanently burned.",
        ],
      },
      whyThisMatters: {
        title: "Why This Matters",
        intro:
          "Harbor revenue continually strengthens the protocol. As adoption grows:",
        bullets: [
          "Treasury ownership is secured",
          "Permanent liquidity deepens",
          "Token supply is reduced",
        ],
        outro:
          "Every stage increases the long-term resilience of the ecosystem.",
      },
    },
  },
} as const;

export type TideFlywheelStage = "treasury" | "pol" | "burn";
