"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ANCHOR_MODAL_FOOTER_WRAPPER,
  ANCHOR_MODAL_SCROLL_CLASS,
} from "@/components/deposit/depositFlowStyles";

type DepositModalLayoutProps = {
  flowOverview?: ReactNode;
  scroll: ReactNode;
  overview?: ReactNode;
  footer?: ReactNode;
  footerDisabled?: boolean;
  className?: string;
};

/** Scroll body with optional flow breadcrumb, pinned overview, and action footer. */
export function DepositModalLayout({
  flowOverview,
  scroll,
  overview,
  footer,
  footerDisabled = false,
  className,
}: DepositModalLayoutProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {flowOverview}
      <div className={ANCHOR_MODAL_SCROLL_CLASS}>{scroll}</div>
      {overview}
      {footer ? (
        <div
          className={cn(
            ANCHOR_MODAL_FOOTER_WRAPPER,
            footerDisabled && "pointer-events-none opacity-60",
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
