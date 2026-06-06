"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useChainId, useSwitchChain } from "wagmi";
import { AnchorDepositWithdrawModal } from "@/components/AnchorDepositWithdrawModal";
import { GenesisManageModal } from "@/components/GenesisManageModal";
import { SailManageModal } from "@/components/SailManageModal";
import {
  isMarketArchived,
  markets,
  type DefinedMarket,
} from "@/config/markets";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { useOpenMarketManageModal } from "@/hooks/useOpenMarketManageModal";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import type { GenesisMarketConfig } from "@/types/genesisMarket";

type GenesisModalPayload = {
  marketId: string;
  market: GenesisMarketConfig;
  initialTab: "deposit" | "withdraw";
};

type AnchorModalPayload = {
  marketId: string;
  market: DefinedMarket;
  initialTab: "deposit" | "withdraw";
  simpleMode: boolean;
  bestPoolType?: "collateral" | "sail";
};

type SailModalPayload = {
  marketId: string;
  market: DefinedMarket;
  initialTab: "mint" | "redeem";
};

/**
 * Opens the existing Genesis / Anchor / Sail manage modals from dashboard rows.
 * Falls back to the product index route when market config is missing.
 */
export function useDashboardManageModals() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isConnected } = useHarborAccount();
  const connectedChainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [genesisModal, setGenesisModal] = useState<GenesisModalPayload | null>(null);
  const [anchorModal, setAnchorModal] = useState<AnchorModalPayload | null>(null);
  const [sailModal, setSailModal] = useState<SailModalPayload | null>(null);

  const { price: ethPrice } = useCoinGeckoPrice("ethereum", 120000);
  const { price: wstETHPrice } = useCoinGeckoPrice("wrapped-steth", 120000);
  const { price: fxSAVEPrice } = useCoinGeckoPrice("fx-usd-saving", 120000);

  const openGenesisModal = useOpenMarketManageModal<GenesisModalPayload>({
    isConnected,
    connectedChainId,
    switchChain,
    setManageModal: setGenesisModal,
    logLabel: "Dashboard Genesis",
  });

  const openAnchorModal = useOpenMarketManageModal<AnchorModalPayload>({
    isConnected,
    connectedChainId,
    switchChain,
    setManageModal: setAnchorModal,
    logLabel: "Dashboard Anchor",
  });

  const openSailModal = useOpenMarketManageModal<SailModalPayload>({
    isConnected,
    connectedChainId,
    switchChain,
    setManageModal: setSailModal,
    logLabel: "Dashboard Sail",
  });

  const invalidateDashboardQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["founderMetrics"] }),
      queryClient.invalidateQueries({ queryKey: ["anchorLedgerMarks"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboardMvPositions"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboardSailPositions"] }),
    ]);
  }, [queryClient]);

  const openPositionManage = useCallback(
    async (row: DashboardPositionRow) => {
      if (!row.marketId) {
        router.push(row.href);
        return;
      }

      const market = (markets as Record<string, DefinedMarket>)[row.marketId];
      if (!market) {
        router.push(row.href);
        return;
      }

      switch (row.category) {
        case "maiden_voyage":
          await openGenesisModal({
            marketId: row.marketId,
            market: market as GenesisMarketConfig,
            initialTab: isMarketArchived(market) ? "withdraw" : "deposit",
          });
          break;
        case "earn":
          await openAnchorModal({
            marketId: row.marketId,
            market,
            initialTab: isMarketArchived(market) ? "withdraw" : "deposit",
            simpleMode: true,
            bestPoolType: row.detail.toLowerCase().includes("sail pool")
              ? "sail"
              : "collateral",
          });
          break;
        case "leverage":
          await openSailModal({
            marketId: row.marketId,
            market,
            initialTab: "redeem",
          });
          break;
        default:
          router.push(row.href);
      }
    },
    [openAnchorModal, openGenesisModal, openSailModal, router],
  );

  const modals = (
    <>
      {genesisModal ? (
        <GenesisManageModal
          isOpen
          onClose={() => setGenesisModal(null)}
          marketId={genesisModal.marketId}
          market={genesisModal.market}
          initialTab={genesisModal.initialTab}
          onSuccess={async () => {
            setGenesisModal(null);
            await invalidateDashboardQueries();
          }}
        />
      ) : null}
      {anchorModal ? (
        <AnchorDepositWithdrawModal
          isOpen
          onClose={() => setAnchorModal(null)}
          marketId={anchorModal.marketId}
          market={anchorModal.market}
          initialTab={anchorModal.initialTab}
          simpleMode={anchorModal.simpleMode}
          bestPoolType={anchorModal.bestPoolType ?? "collateral"}
          onSuccess={async () => {
            setAnchorModal(null);
            await invalidateDashboardQueries();
          }}
        />
      ) : null}
      {sailModal ? (
        <SailManageModal
          isOpen
          onClose={() => setSailModal(null)}
          marketId={sailModal.marketId}
          market={sailModal.market}
          initialTab={sailModal.initialTab}
          ethPrice={ethPrice}
          wstETHPrice={wstETHPrice}
          fxSAVEPrice={fxSAVEPrice}
          onSuccess={async () => {
            setSailModal(null);
            await invalidateDashboardQueries();
          }}
        />
      ) : null}
    </>
  );

  return { openPositionManage, modals };
}
