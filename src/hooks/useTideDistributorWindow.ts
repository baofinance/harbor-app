"use client";

import { useReadContract } from "wagmi";
import { HARBOR_TIDE_DISTRIBUTOR_ABI } from "@/abis/harborTideDistributor";
import { TIDE_CONFIG } from "@/config/tide";
import {
  formatTideClaimWindowFooter,
  formatTideClaimWindowMessage,
  getTideClaimWindowStatus,
  type TideClaimWindowStatus,
} from "@/utils/tideDistributor";

export function useTideDistributorWindow() {
  const distributor = TIDE_CONFIG.distributorAddress;

  const { data: startDate, isLoading: isLoadingStart } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "startDate",
    chainId: TIDE_CONFIG.chainId,
  });

  const { data: endDate, isLoading: isLoadingEnd } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "endDate",
    chainId: TIDE_CONFIG.chainId,
  });

  const start = startDate as bigint | undefined;
  const end = endDate as bigint | undefined;
  const status: TideClaimWindowStatus = getTideClaimWindowStatus(start, end);

  return {
    startDate: start,
    endDate: end,
    isLoading: isLoadingStart || isLoadingEnd,
    status,
    isWindowOpen: status === "open",
    airdropDateMs: start !== undefined ? Number(start) * 1000 : undefined,
    windowMessage: formatTideClaimWindowMessage(status, start, end),
    windowFooter: formatTideClaimWindowFooter(status, start, end),
  };
}
