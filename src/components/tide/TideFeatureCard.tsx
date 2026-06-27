"use client";

import type { ReactNode } from "react";
import { Info, Link2 } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/portfolio/StatusBadge";
import type { StatusBadgeVariant } from "@/components/dashboard/portfolio/StatusBadge";
import {
  TIDE_CAPTION_CLASS,
  TIDE_CARD_BODY,
  TIDE_CARD_FOOTER,
  TIDE_DISCONNECTED_RING,
  TIDE_FEATURE_CARD_SHELL,
  TIDE_FEATURE_CARD_TITLE,
  TIDE_FOOTER_NOTE_CLASS,
  TIDE_INSET_LIGHT_LABEL_CLASS,
} from "./tideCardStyles";

export type TideFeatureCardProps = {
  icon: ReactNode;
  iconBadgeClass: string;
  title: string;
  subtitle: string;
  subtitleClass: string;
  badge?: string;
  badgeVariant?: StatusBadgeVariant;
  footer?: string;
  footerExtra?: ReactNode;
  footerExtraClassName?: string;
  isConnected: boolean;
  disconnectedMessage: string;
  children: ReactNode;
};

export function TideFeatureCard({
  icon,
  iconBadgeClass,
  title,
  subtitle,
  subtitleClass,
  badge,
  badgeVariant = "neutral",
  footer,
  footerExtra,
  footerExtraClassName,
  isConnected,
  disconnectedMessage,
  children,
}: TideFeatureCardProps) {
  return (
    <article className={TIDE_FEATURE_CARD_SHELL}>
      <header className="shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={iconBadgeClass} aria-hidden>
              {icon}
            </span>
            <div className="min-w-0">
              <h3 className={TIDE_FEATURE_CARD_TITLE}>{title}</h3>
              <p
                className={`${TIDE_INSET_LIGHT_LABEL_CLASS} mt-0.5 normal-case ${subtitleClass}`}
              >
                {subtitle}
              </p>
            </div>
          </div>
          {badge ? (
            <StatusBadge label={badge} variant={badgeVariant} surface="light" />
          ) : null}
        </div>
      </header>

      <div className={TIDE_CARD_BODY}>
        {isConnected ? (
          children
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center lg:justify-center">
            <div className={TIDE_DISCONNECTED_RING}>
              <Link2 className="h-7 w-7 text-[#1E4775]/25" strokeWidth={1.5} />
            </div>
            <p className={`max-w-[220px] ${TIDE_CAPTION_CLASS}`}>
              {disconnectedMessage}
            </p>
          </div>
        )}
      </div>

      {footer || footerExtra ? (
        <footer className={`${TIDE_CARD_FOOTER} flex flex-col gap-1`}>
          {footer ? (
            <div className="flex items-center gap-1.5">
              <Info
                className="h-3.5 w-3.5 shrink-0 text-[#1E4775]/40"
                strokeWidth={1.75}
              />
              <span className={TIDE_FOOTER_NOTE_CLASS}>{footer}</span>
            </div>
          ) : footerExtra ? (
            <div className="flex items-center gap-1.5">
              <Info
                className="h-3.5 w-3.5 shrink-0 text-[#1E4775]/40"
                strokeWidth={1.75}
              />
              <p className={footerExtraClassName ?? TIDE_FOOTER_NOTE_CLASS}>
                {footerExtra}
              </p>
            </div>
          ) : null}
          {footer && footerExtra ? (
            <p className={footerExtraClassName ?? TIDE_FOOTER_NOTE_CLASS}>
              {footerExtra}
            </p>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
