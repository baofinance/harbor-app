"use client";

import type { ReactNode } from "react";
import {
  AnchorMarketsToolbar,
  type AnchorMarketsToolbarProps,
} from "./AnchorMarketsToolbar";

export type AnchorMarketsSectionsProps = {
  toolbarProps: AnchorMarketsToolbarProps;
  children: ReactNode;
};

/**
 * Toolbar + main stability-pool list (rows passed as children). Parity with
 * Genesis `GenesisMarketsSections` / Sail `SailMarketsSections`.
 */
export function AnchorMarketsSections({
  toolbarProps,
  children,
}: AnchorMarketsSectionsProps) {
  return (
    <section
      className="space-y-2 overflow-visible"
      aria-label="Anchor stability pools"
    >
      <AnchorMarketsToolbar {...toolbarProps} />
      {children}
    </section>
  );
}
