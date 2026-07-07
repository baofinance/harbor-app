"use client";

import type { ReactNode } from "react";
import {
  IndexMarketsSections,
  type IndexMarketsSectionCardConfig,
} from "@/components/shared/IndexMarketsSections";
import {
  AnchorMarketsToolbar,
  type AnchorMarketsToolbarProps,
} from "./AnchorMarketsToolbar";

export type AnchorMarketsSectionsProps = {
  toolbarProps: AnchorMarketsToolbarProps;
  children: ReactNode;
  sectionCard?: IndexMarketsSectionCardConfig;
};

/** Toolbar + main stability-pool list (rows passed as children). */
export function AnchorMarketsSections({
  toolbarProps,
  children,
  sectionCard,
}: AnchorMarketsSectionsProps) {
  return (
    <IndexMarketsSections
      ariaLabel="Anchor stability pools"
      Toolbar={AnchorMarketsToolbar}
      toolbarProps={toolbarProps}
      sectionCard={sectionCard}
    >
      {children}
    </IndexMarketsSections>
  );
}
