import {
  isGenesisDepositWithdrawBlockedByConfig,
  isGenesisSoonUi,
  isMarketInMaintenance,
} from "@/config/markets";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";

export type ActiveVoyageStatus =
  | "claim_available"
  | "launch_complete"
  | "opening_soon"
  | "capacity_reached"
  | "preparing_launch"
  | "almost_full"
  | "deposits_open";

export type GenesisPhase = "scheduled" | "live" | "closed" | "completed" | "unknown";

export type DeriveActiveVoyageStatusInput = {
  market: GenesisMarketConfig;
  onChainEnded: boolean;
  hasClaimable: boolean;
  genesisPhase: GenesisPhase;
  capDisplay: GenesisVoyageCapDisplay | null;
};

const STATUS_LABEL: Record<ActiveVoyageStatus, string> = {
  claim_available: "Claim Available",
  launch_complete: "Launch Complete",
  opening_soon: "Opening Soon",
  capacity_reached: "Capacity Reached",
  preparing_launch: "Preparing Launch",
  almost_full: "Almost Full",
  deposits_open: "Deposits Open",
};

export function getActiveVoyageStatusLabel(status: ActiveVoyageStatus): string {
  return STATUS_LABEL[status];
}

export function deriveActiveVoyageStatus(
  input: DeriveActiveVoyageStatusInput,
): ActiveVoyageStatus {
  const {
    market,
    onChainEnded,
    hasClaimable,
    genesisPhase,
    capDisplay,
  } = input;

  const maintenance = isMarketInMaintenance(market);
  const depositBlocked = isGenesisDepositWithdrawBlockedByConfig(market);
  const capFilled = capDisplay?.capFilled ?? false;
  const remainingPct = capDisplay?.remainingPct ?? 100;

  const depositsAllowed =
    !maintenance &&
    !depositBlocked &&
    !onChainEnded &&
    !capFilled &&
    genesisPhase === "live";

  if (onChainEnded && hasClaimable) return "claim_available";
  if (onChainEnded) return "launch_complete";

  if (isGenesisSoonUi(market) || genesisPhase === "scheduled") {
    return "opening_soon";
  }

  if (
    !onChainEnded &&
    (capFilled || remainingPct <= 0)
  ) {
    return "capacity_reached";
  }

  if (
    !onChainEnded &&
    genesisPhase === "closed" &&
    !capFilled
  ) {
    return "preparing_launch";
  }

  if (!depositsAllowed && !onChainEnded && capFilled) {
    return "preparing_launch";
  }

  if (!depositsAllowed && !onChainEnded) {
    return "opening_soon";
  }

  if (depositsAllowed && remainingPct <= 10) {
    return "almost_full";
  }

  return "deposits_open";
}

export type ActiveVoyageCta = {
  label: string;
  disabled: boolean;
  action: "deposit" | "claim" | "none";
};

export function getActiveVoyageCta(
  status: ActiveVoyageStatus,
  opts: {
    isClaiming?: boolean;
    hasGenesisAddress?: boolean;
    isConnected?: boolean;
  } = {},
): ActiveVoyageCta {
  const { isClaiming, hasGenesisAddress, isConnected } = opts;

  switch (status) {
    case "deposits_open":
      return { label: "Deposit Now", disabled: false, action: "deposit" };
    case "almost_full":
      return {
        label: "Deposit Before It Closes",
        disabled: false,
        action: "deposit",
      };
    case "claim_available":
      return {
        label: "Claim Anchor + Sail",
        disabled:
          !isConnected || !hasGenesisAddress || isClaiming === true,
        action: "claim",
      };
    case "opening_soon":
      return { label: "Opening Soon", disabled: true, action: "none" };
    case "capacity_reached":
      return { label: "Capacity Reached", disabled: true, action: "none" };
    case "preparing_launch":
      return { label: "Preparing Launch", disabled: true, action: "none" };
    case "launch_complete":
      return { label: "Launch Complete", disabled: true, action: "none" };
    default:
      return { label: "Deposit Now", disabled: true, action: "none" };
  }
}

export function getActiveVoyageFootnote(status: ActiveVoyageStatus): string {
  switch (status) {
    case "deposits_open":
    case "almost_full":
      return "";
    case "capacity_reached":
      return "Waiting for the market to launch.";
    case "preparing_launch":
      return "Claims open after launch.";
    case "claim_available":
      return "Claim your Anchor and Sail tokens.";
    case "launch_complete":
      return "This voyage has launched.";
    case "opening_soon":
      return "Deposits will open when the voyage goes live.";
    default:
      return "";
  }
}

export function getActiveVoyageZeroStateCopy(
  status: ActiveVoyageStatus,
  filledPct: number,
): { line1: string } | null {
  if (filledPct >= 1) return null;
  if (status !== "deposits_open" && status !== "almost_full") return null;
  return {
    line1: "Be among the first depositors—capacity is fully open.",
  };
}

export function getCapDataSourceLabel(
  cap: GenesisVoyageCapDisplay | null,
  isLoading: boolean,
  isUnavailable: boolean,
): string | null {
  if (isLoading) return "Updating…";
  if (isUnavailable) return null;
  if (!cap) return null;
  if (cap.isLoading) return "Updating…";
  if (cap.dataSource === "subgraph") return "Live cap data";
  if (cap.dataSource === "onchain_fallback") return "Using on-chain fallback";
  return null;
}
