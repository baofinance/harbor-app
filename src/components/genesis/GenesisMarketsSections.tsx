"use client";

/**
 * Wraps the active Genesis market list: toolbar + main table / rows (passed as children).
 * @see docs/routes/genesis.md
 */
import type { ReactNode } from "react";
import {
  GenesisMarketsToolbar,
  type GenesisMarketsToolbarProps,
} from "./GenesisMarketsToolbar";

export type GenesisMarketsSectionsProps = {
  toolbarProps: GenesisMarketsToolbarProps;
  children: ReactNode;
};

export function GenesisMarketsSections({
  toolbarProps,
  children,
}: GenesisMarketsSectionsProps) {
  return (
    <section className="space-y-2 overflow-visible" aria-label="Genesis markets">
      <GenesisMarketsToolbar {...toolbarProps} />
      {children}
    </section>
  );
}
