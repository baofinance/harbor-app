"use client";

import type { ReactNode } from "react";
import {
  SailMarketsToolbar,
  type SailMarketsToolbarProps,
} from "./SailMarketsToolbar";

export type SailMarketsSectionsProps = {
  toolbarProps: SailMarketsToolbarProps;
  children: ReactNode;
};

/**
 * Toolbar + main table area for Sail index (rows passed as children).
 */
export function SailMarketsSections({
  toolbarProps,
  children,
}: SailMarketsSectionsProps) {
  return (
    <section className="space-y-2 overflow-visible" aria-label="Sail markets">
      <SailMarketsToolbar {...toolbarProps} />
      {children}
    </section>
  );
}
