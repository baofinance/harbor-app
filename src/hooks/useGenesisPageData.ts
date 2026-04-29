"use client";

import { useCallback, useMemo } from "react";
import { markets } from "@/config/markets";
import { getWeb3iconsNetworkId } from "@/config/web3iconsNetworks";
import {
  useAllHarborMarks,
  useAllMaidenVoyageCampaignIndex,
} from "@/hooks/useHarborMarks";
import { formatGenesisMarketDisplayName } from "@/utils/genesisDisplay";

/**
 * Genesis index route: market list config, subgraph marks, bonus status, combined error flags, and display helpers.
 * Heavy Wagmi reads and UI state stay in `genesis/page.tsx` until further split.
 */
export function useGenesisPageData() {
  const genesisMarkets = useMemo(
    () =>
      Object.entries(markets).filter(([_, mkt]) => {
        const genesisAddr = (mkt as { addresses?: { genesis?: string } }).addresses
          ?.genesis;
        return (
          genesisAddr &&
          genesisAddr !== "0x0000000000000000000000000000000000000000" &&
          (mkt as { status?: string }).status !== "coming-soon"
        );
      }),
    []
  );

  const genesisChainOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: {
      id: string;
      label: string;
      iconUrl?: string;
      networkId?: string;
    }[] = [];
    genesisMarkets.forEach(([, m]) => {
      const name = (m as { chain?: { name?: string } }).chain?.name || "Ethereum";
      if (seen.has(name)) return;
      seen.add(name);
      const logo = (m as { chain?: { logo?: string } }).chain?.logo || "icons/eth.png";
      const networkId = getWeb3iconsNetworkId(name);
      options.push({
        id: name,
        label: name,
        iconUrl: networkId ? undefined : logo.startsWith("/") ? logo : `/${logo}`,
        networkId,
      });
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [genesisMarkets]);

  const comingSoonMarkets = useMemo(
    () =>
      Object.entries(markets).filter(
        ([_, mkt]) =>
          (mkt as { status?: string }).status === "coming-soon" &&
          (mkt as { marksCampaign?: { id?: string } }).marksCampaign?.id ===
            "metals-maiden-voyage"
      ),
    []
  );

  const genesisAddresses = useMemo(
    () =>
      genesisMarkets
        .map(([_, mkt]) => (mkt as { addresses?: { genesis?: string } }).addresses?.genesis)
        .filter(
          (addr): addr is string =>
            !!addr &&
            typeof addr === "string" &&
            addr !== "0x0000000000000000000000000000000000000000"
        ),
    [genesisMarkets]
  );

  const {
    data: allMarksData,
    isLoading: isLoadingMarks,
    refetch: refetchMarks,
    error: marksError,
  } = useAllHarborMarks(genesisAddresses);

  const marksResults = allMarksData?.results ?? [];
  const hasIndexerErrors = allMarksData?.hasIndexerErrors ?? false;
  const hasAnyErrors = allMarksData?.hasAnyErrors ?? false;
  const marketsWithIndexerErrors = allMarksData?.marketsWithIndexerErrors ?? [];
  const marketsWithOtherErrors = allMarksData?.marketsWithOtherErrors ?? [];

  const getMarketName = useCallback(
    (genesisAddress: string) => {
      const market = genesisMarkets.find(
        ([_, mkt]) =>
          (mkt as { addresses?: { genesis?: string } }).addresses?.genesis?.toLowerCase() ===
          genesisAddress.toLowerCase()
      );
      if (!market)
        return genesisAddress.slice(0, 6) + "..." + genesisAddress.slice(-4);
      const [id, mkt] = market;
      const rowLeveragedSymbol = (mkt as { rowLeveragedSymbol?: string })
        .rowLeveragedSymbol;
      const raw =
        rowLeveragedSymbol &&
        rowLeveragedSymbol.toLowerCase().startsWith("hs")
          ? rowLeveragedSymbol.slice(2)
          : rowLeveragedSymbol || (mkt as { name?: string }).name || id;
      return formatGenesisMarketDisplayName(raw);
    },
    [genesisMarkets]
  );

  const { data: maidenVoyageCampaign, isLoading: isLoadingMaidenVoyageIndex } =
    useAllMaidenVoyageCampaignIndex(genesisAddresses);

  const maidenVoyageCampaignResults = maidenVoyageCampaign?.results ?? [];
  const maidenVoyageHasIndexerErrors =
    maidenVoyageCampaign?.hasIndexerErrors ?? false;
  const maidenVoyageHasAnyErrors = maidenVoyageCampaign?.hasAnyErrors ?? false;
  const maidenVoyageMarketsWithIndexerErrors =
    maidenVoyageCampaign?.marketsWithIndexerErrors ?? [];
  const maidenVoyageMarketsWithOtherErrors =
    maidenVoyageCampaign?.marketsWithOtherErrors ?? [];

  const combinedHasIndexerErrors =
    hasIndexerErrors || maidenVoyageHasIndexerErrors;
  const combinedHasAnyErrors = hasAnyErrors || maidenVoyageHasAnyErrors;
  const combinedMarketsWithIndexerErrors = Array.from(
    new Set([
      ...marketsWithIndexerErrors,
      ...maidenVoyageMarketsWithIndexerErrors,
    ])
  );
  const combinedMarketsWithOtherErrors = Array.from(
    new Set([
      ...marketsWithOtherErrors,
      ...maidenVoyageMarketsWithOtherErrors,
    ])
  );

  const marketsWithOraclePricingError = useMemo(() => {
    const list: string[] = [];
    (marksResults || []).forEach(
      (r: {
        genesisAddress?: string;
        data?: {
          userHarborMarks?: {
            currentDeposit?: string;
            currentDepositUSD?: string;
          };
        };
        errors?: unknown[];
      }) => {
        const marks = r.data?.userHarborMarks;
        if (!marks || r.errors?.length) return;
        const currentDeposit = parseFloat(marks.currentDeposit || "0");
        const currentDepositUSD = parseFloat(marks.currentDepositUSD || "0");
        if (currentDeposit > 0 && currentDepositUSD === 0 && r.genesisAddress) {
          list.push(r.genesisAddress);
        }
      }
    );
    return list;
  }, [marksResults]);
  const hasOraclePricingError = marketsWithOraclePricingError.length > 0;

  return {
    genesisMarkets,
    genesisChainOptions,
    comingSoonMarkets,
    genesisAddresses,
    marksResults,
    isLoadingMarks,
    refetchMarks,
    marksError,
    maidenVoyageCampaignResults,
    isLoadingMaidenVoyageIndex,
    combinedHasIndexerErrors,
    combinedMarketsWithIndexerErrors,
    combinedHasAnyErrors,
    combinedMarketsWithOtherErrors,
    hasOraclePricingError,
    marketsWithOraclePricingError,
    getMarketName,
  };
}
