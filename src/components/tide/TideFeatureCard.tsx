"use client";

import type { ReactNode } from "react";
import { Info, Link2 } from "lucide-react";
import {
  TIDE_CARD_BODY,
  TIDE_CARD_FOOTER,
  TIDE_CARD_HEADER,
  TIDE_CARD_SHELL,
  TIDE_DISCONNECTED_RING,
  TIDE_LABEL_CLASS,
} from "./tideCardStyles";

export type TideFeatureCardProps = {
  icon: ReactNode;
  iconBgClass: string;
  title: string;
  subtitle: string;
  subtitleClass: string;
  badge?: string;
  badgeClass?: string;
  footer: string;
  isConnected: boolean;
  disconnectedMessage: string;
  children: ReactNode;
};

export function TideFeatureCard({
  icon,
  iconBgClass,
  title,
  subtitle,
  subtitleClass,
  badge,
  badgeClass,
  footer,
  isConnected,
  disconnectedMessage,
  children,
}: TideFeatureCardProps) {
  return (
    <article className={TIDE_CARD_SHELL}>
      <header className={TIDE_CARD_HEADER}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className={`${TIDE_LABEL_CLASS} ${subtitleClass}`}>{subtitle}</p>
          </div>
        </div>
        {badge ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass ?? "bg-white/10 text-white/60"}`}
          >
            {badge}
          </span>
        ) : null}
      </header>

      <div className={TIDE_CARD_BODY}>
        {isConnected ? (
          children
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={TIDE_DISCONNECTED_RING}>
              <Link2 className="h-7 w-7 text-white/25" strokeWidth={1.5} />
            </div>
            <p className="max-w-[220px] text-sm leading-snug text-white/45">
              {disconnectedMessage}
            </p>
          </div>
        )}
      </div>

      <footer className={TIDE_CARD_FOOTER}>
        <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span>{footer}</span>
      </footer>
    </article>
  );
}
