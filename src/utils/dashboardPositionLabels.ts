import { markets } from "@/config/markets";
import { isMegaethMaidenVoyageMarket } from "@/utils/megaethMarket";

export type DashboardMarketRef = {
  marketId: string;
  displayName: string;
};

export type DashboardGenesisRef = DashboardMarketRef & {
  /** When true, omit from Maiden Voyage dashboard lists (MegaETH parity with genesis index). */
  hideFromMvList: boolean;
};

export type DashboardPoolRef = DashboardMarketRef & {
  roleLabel: "Anchor pool" | "Sail pool";
};

function lower(s: string | undefined | null): string | null {
  if (!s || typeof s !== "string") return null;
  return s.toLowerCase();
}

/**
 * Maps contract addresses from `markets` for dashboard position labeling.
 * Call from a hook with `useMemo(() => buildDashboardAddressIndex(), [])`.
 */
export function buildDashboardAddressIndex(): {
  genesisByAddressLower: Map<string, DashboardGenesisRef>;
  poolByAddressLower: Map<string, DashboardPoolRef>;
  haTokenByAddressLower: Map<string, DashboardMarketRef>;
  leveragedTokenByAddressLower: Map<string, DashboardMarketRef>;
} {
  const genesisByAddressLower = new Map<string, DashboardGenesisRef>();
  const poolByAddressLower = new Map<string, DashboardPoolRef>();
  const haTokenByAddressLower = new Map<string, DashboardMarketRef>();
  const leveragedTokenByAddressLower = new Map<string, DashboardMarketRef>();

  for (const [marketId, m] of Object.entries(markets)) {
    const name = (m as { name?: string }).name ?? marketId;
    const addrs = (m as { addresses?: Record<string, string> }).addresses;
    if (!addrs) continue;

    const ref: DashboardMarketRef = { marketId, displayName: name };

    const g = lower(addrs.genesis);
    if (g && g !== "0x0000000000000000000000000000000000000000") {
      genesisByAddressLower.set(g, {
        ...ref,
        hideFromMvList: isMegaethMaidenVoyageMarket(marketId, m),
      });
    }

    const coll = lower(addrs.stabilityPoolCollateral);
    if (coll) {
      poolByAddressLower.set(coll, { ...ref, roleLabel: "Anchor pool" });
    }
    const levPool = lower(addrs.stabilityPoolLeveraged);
    if (levPool) {
      poolByAddressLower.set(levPool, { ...ref, roleLabel: "Sail pool" });
    }

    const peg = lower(addrs.peggedToken);
    if (peg) {
      haTokenByAddressLower.set(peg, { ...ref });
    }

    const levTok = lower(addrs.leveragedToken);
    if (levTok) {
      leveragedTokenByAddressLower.set(levTok, { ...ref });
    }
  }

  return {
    genesisByAddressLower,
    poolByAddressLower,
    haTokenByAddressLower,
    leveragedTokenByAddressLower,
  };
}
