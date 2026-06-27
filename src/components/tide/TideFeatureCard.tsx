"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  DASHBOARD_PRODUCT_ACCENT_BAR_CLASS,
  DASHBOARD_PRODUCT_CARD_CLASS,
  DASHBOARD_PRODUCT_TITLE_CLASS,
} from "@/components/dashboard/dashboardStyles";
import { StatusBadge } from "@/components/dashboard/portfolio/StatusBadge";
import type { StatusBadgeVariant } from "@/components/dashboard/portfolio/StatusBadge";
import {
  TIDE_CARD_BODY,
  TIDE_CARD_FOOTER,
  TIDE_LABEL_CLASS,
} from "./tideCardStyles";

export type TideFeatureCardProps = {
  icon: ReactNode;
  accentBarClass: string;
  iconBadgeClass: string;
  title: string;
  subtitle: string;
  subtitleClass: string;
  badge?: string;
  badgeVariant?: StatusBadgeVariant;
  footer?: string;
  footerExtra?: ReactNode;
  footerExtraClassName?: string;
  children: ReactNode;
};

export function TideFeatureCard({
  icon,
  accentBarClass,
  iconBadgeClass,
  title,
  subtitle,
  subtitleClass,
  badge,
  badgeVariant = "neutral",
  footer,
  footerExtra,
  footerExtraClassName,
  children,
}: TideFeatureCardProps) {
  return (
    <article
      className={`${DASHBOARD_PRODUCT_CARD_CLASS} relative flex min-h-[320px] flex-col lg:h-full`}
    >
      <div
        className={`${DASHBOARD_PRODUCT_ACCENT_BAR_CLASS} ${accentBarClass}`}
        aria-hidden
      />

      <header className="px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={iconBadgeClass} aria-hidden>
              {icon}
            </span>
            <div className="min-w-0">
              <h3 className={DASHBOARD_PRODUCT_TITLE_CLASS}>{title}</h3>
              <p className={`${TIDE_LABEL_CLASS} mt-0.5 ${subtitleClass}`}>
                {subtitle}
              </p>
            </div>
          </div>
          {badge ? (
            <StatusBadge
              label={badge}
              variant={badgeVariant}
              surface="dark"
            />
          ) : null}
        </div>
      </header>

      <div className={TIDE_CARD_BODY}>{children}</div>

      {footer || footerExtra ? (
        <footer
          className={`${TIDE_CARD_FOOTER} flex flex-col gap-1 px-3 py-2.5 sm:px-4`}
        >
          {footer ? (
            <div className="flex items-center gap-1.5">
              <Info
                className="h-3.5 w-3.5 shrink-0 text-white/40"
                strokeWidth={1.75}
              />
              <span className="text-[11px] text-white/45">{footer}</span>
            </div>
          ) : footerExtra ? (
            <div className="flex items-center gap-1.5">
              <Info
                className="h-3.5 w-3.5 shrink-0 text-white/40"
                strokeWidth={1.75}
              />
              <p className={footerExtraClassName ?? "text-[11px] text-white/45"}>
                {footerExtra}
              </p>
            </div>
          ) : null}
          {footer && footerExtra ? (
            <p className={footerExtraClassName ?? "text-[10px] text-white/45"}>
              {footerExtra}
            </p>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
