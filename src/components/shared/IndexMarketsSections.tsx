"use client";

import type { ComponentType, ReactNode } from "react";

export type IndexMarketsSectionsProps<ToolbarProps> = {
  ariaLabel: string;
  Toolbar: ComponentType<ToolbarProps>;
  toolbarProps: ToolbarProps;
  children: ReactNode;
};

/**
 * Shared toolbar + markets list shell for Genesis / Anchor / Sail index pages.
 */
export function IndexMarketsSections<ToolbarProps>({
  ariaLabel,
  Toolbar,
  toolbarProps,
  children,
}: IndexMarketsSectionsProps<ToolbarProps>) {
  return (
    <section className="space-y-2 overflow-visible" aria-label={ariaLabel}>
      <Toolbar {...toolbarProps} />
      {children}
    </section>
  );
}
