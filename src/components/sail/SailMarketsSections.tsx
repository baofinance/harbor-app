"use client";

import type { ReactNode } from "react";
import { IndexMarketsSections } from "@/components/shared/IndexMarketsSections";
import {
  SailMarketsToolbar,
  type SailMarketsToolbarProps,
} from "./SailMarketsToolbar";

export type SailMarketsSectionsProps = {
  toolbarProps: SailMarketsToolbarProps;
  children: ReactNode;
};

/** Toolbar + main table area for Sail index (rows passed as children). */
export function SailMarketsSections({
  toolbarProps,
  children,
}: SailMarketsSectionsProps) {
  return (
    <IndexMarketsSections
      ariaLabel="Sail markets"
      Toolbar={SailMarketsToolbar}
      toolbarProps={toolbarProps}
    >
      {children}
    </IndexMarketsSections>
  );
}
