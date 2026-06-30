"use client";

import { ConnectWallet } from "@/components/Wallet";
import { HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS } from "@/components/shared/harborStatTileStyles";

type SailConnectWalletStripNoticeProps = {
  message: string;
  className?: string;
};

/** Compact connect prompt for frosted stat strips on the Sail leverage page. */
export function SailConnectWalletStripNotice({
  message,
  className = "",
}: SailConnectWalletStripNoticeProps) {
  return (
    <div
      className={`${HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS} flex flex-col items-center justify-center gap-2 px-3 py-3 sm:flex-row sm:gap-3 sm:py-2.5 ${className}`.trim()}
    >
      <p className="text-center text-xs leading-snug text-white/75">{message}</p>
      <div className="shrink-0">
        <ConnectWallet />
      </div>
    </div>
  );
}
