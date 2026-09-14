"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { DefinedMarket } from "@/config/markets";
import type { SailTradeMarketFees } from "@/components/sail/SailTradeFeeFooter";
import {
  SAIL_ADVANCED_LIGHT_BODY,
  SAIL_ADVANCED_LIGHT_SECTION_TITLE,
  SAIL_EMBEDDED_FORM_PANEL,
  SAIL_EMBEDDED_PANEL_HEIGHT,
} from "./sailAdvancedStyles";

const SailManageModal = dynamic(
  () =>
    import("@/components/SailManageModal").then((m) => m.SailManageModal),
  { ssr: false },
);

export type SailMarketActionPanelProps = {
  marketId: string;
  market: DefinedMarket;
  initialTab?: "mint" | "redeem";
  onSuccess?: () => void;
  leveragedTokenPriceUSD?: number;
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  fxSAVEPrice?: number | null;
  marketFees?: SailTradeMarketFees;
  isComingSoon?: boolean;
  /** ~1x leverage — mint/buy disabled until more ha liquidity exists. */
  depositsPaused?: boolean;
};

function SailTradePanelSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4"
      aria-busy="true"
      aria-label="Loading trade panel"
    >
      <div className="h-9 w-full animate-pulse rounded-lg bg-[#1E4775]/10" />
      <div className="h-24 w-full animate-pulse rounded-xl bg-[#1E4775]/8" />
      <div className="mt-auto h-11 w-full animate-pulse rounded-lg bg-[#1E4775]/10" />
    </div>
  );
}

/**
 * Embedded Buy | Sell panel — wraps `SailManageModal` in inline mode.
 * Modal mount is deferred until after first paint/idle so soft-nav into
 * `/sail` is not blocked by the heavy trade client tree.
 */
export function SailMarketActionPanel({
  marketId,
  market,
  initialTab = "mint",
  onSuccess,
  leveragedTokenPriceUSD,
  ethPrice,
  wstETHPrice,
  fxSAVEPrice,
  marketFees,
  isComingSoon = false,
  depositsPaused = false,
}: SailMarketActionPanelProps) {
  const [tradePanelReady, setTradePanelReady] = useState(false);

  useEffect(() => {
    if (isComingSoon || tradePanelReady) return;

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const enable = () => {
      if (!cancelled) setTradePanelReady(true);
    };

    const rafId = window.requestAnimationFrame(() => {
      const ric = window.requestIdleCallback?.bind(window);
      if (ric) {
        idleId = ric(enable, { timeout: 400 });
      } else {
        timeoutId = setTimeout(enable, 0);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (idleId != null) window.cancelIdleCallback?.(idleId);
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [isComingSoon, tradePanelReady]);

  return (
    <aside className="flex flex-col">
      <div
        className={`${SAIL_EMBEDDED_FORM_PANEL} ${SAIL_EMBEDDED_PANEL_HEIGHT} flex w-full min-w-0 flex-col overflow-hidden`}
      >
        {isComingSoon ? (
          <div className="flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <p className={SAIL_ADVANCED_LIGHT_SECTION_TITLE}>Coming soon</p>
            <p className={SAIL_ADVANCED_LIGHT_BODY}>
              This market is not live yet. Check back when it opens for minting
              and redeeming.
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {tradePanelReady ? (
              <SailManageModal
                embedded
                isOpen
                onClose={() => {}}
                marketId={marketId}
                market={market}
                initialTab={initialTab}
                onSuccess={onSuccess}
                leveragedTokenPriceUSD={leveragedTokenPriceUSD}
                ethPrice={ethPrice}
                wstETHPrice={wstETHPrice}
                fxSAVEPrice={fxSAVEPrice}
                marketFees={marketFees}
                depositsPaused={depositsPaused}
              />
            ) : (
              <SailTradePanelSkeleton />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
