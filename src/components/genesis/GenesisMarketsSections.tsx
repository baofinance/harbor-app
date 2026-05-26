"use client";

/**
 * Wraps the active Genesis market list: toolbar + main table / rows (passed as children).
 * @see docs/routes/genesis.md
 */
import type { ReactNode } from "react";
import { IndexMarketsSections } from "@/components/shared/IndexMarketsSections";
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
    <IndexMarketsSections
      ariaLabel="Genesis markets"
      Toolbar={GenesisMarketsToolbar}
      toolbarProps={toolbarProps}
    >
      {children}
    </IndexMarketsSections>
  );
}
