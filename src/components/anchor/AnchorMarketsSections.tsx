"use client";

import type { ReactNode } from "react";
import { IndexMarketsSections } from "@/components/shared/IndexMarketsSections";
import {
  AnchorMarketsToolbar,
  type AnchorMarketsToolbarProps,
} from "./AnchorMarketsToolbar";

export type AnchorMarketsSectionsProps = {
  toolbarProps: AnchorMarketsToolbarProps;
  children: ReactNode;
};

/** Toolbar + main stability-pool list (rows passed as children). */
export function AnchorMarketsSections({
  toolbarProps,
  children,
}: AnchorMarketsSectionsProps) {
  return (
    <IndexMarketsSections
      ariaLabel="Anchor stability pools"
      Toolbar={AnchorMarketsToolbar}
      toolbarProps={toolbarProps}
    >
      {children}
    </IndexMarketsSections>
  );
}
