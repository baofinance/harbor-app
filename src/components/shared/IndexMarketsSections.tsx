"use client";

import type { ComponentType, ReactNode } from "react";
import { HarborSectionCard } from "./HarborSectionCard";

export type IndexMarketsSectionCardConfig = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  accentBarClass: string;
  iconBadgeClass?: string;
  summary?: ReactNode;
  id?: string;
};

export type IndexMarketsSectionsProps<ToolbarProps> = {
  ariaLabel: string;
  Toolbar: ComponentType<ToolbarProps>;
  toolbarProps: ToolbarProps;
  children: ReactNode;
  sectionCard?: IndexMarketsSectionCardConfig;
};

/**
 * Shared toolbar + markets list shell for Genesis / Anchor / Sail index pages.
 */
export function IndexMarketsSections<ToolbarProps>({
  ariaLabel,
  Toolbar,
  toolbarProps,
  children,
  sectionCard,
}: IndexMarketsSectionsProps<ToolbarProps>) {
  const content = (
    <>
      <Toolbar {...toolbarProps} />
      {children}
    </>
  );

  if (sectionCard) {
    return (
      <HarborSectionCard
        id={sectionCard.id}
        title={sectionCard.title}
        icon={sectionCard.icon}
        accentBarClass={sectionCard.accentBarClass}
        iconBadgeClass={sectionCard.iconBadgeClass}
        summary={sectionCard.summary}
        ariaLabel={ariaLabel}
        className="space-y-2"
      >
        {content}
      </HarborSectionCard>
    );
  }

  return (
    <section className="space-y-2 overflow-visible" aria-label={ariaLabel}>
      {content}
    </section>
  );
}
