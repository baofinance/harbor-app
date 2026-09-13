"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ANCHOR_MODAL_FOOTER_WRAPPER,
  ANCHOR_MODAL_SCROLL_CLASS,
  DEPOSIT_MODAL_LAYOUT_CLASS,
  DEPOSIT_MODAL_PINNED_BOTTOM_CLASS,
} from "@/components/deposit/depositFlowStyles";

type DepositModalLayoutProps = {
  /** Optional row above the flow breadcrumb (e.g. Genesis Deposit|Withdraw tabs). */
  header?: ReactNode;
  flowOverview?: ReactNode;
  scroll: ReactNode;
  overview?: ReactNode;
  footer?: ReactNode;
  footerDisabled?: boolean;
  className?: string;
  /** Optional class for the body stack (header · flow · scroll · overview). */
  bodyClassName?: string;
  /** Optional class for the action footer strip (e.g. fixed Genesis height). */
  footerClassName?: string;
  /**
   * When true, footer sits outside the pinned overview block so body/footer
   * heights can be controlled independently (Genesis 400 + 80).
   */
  splitFooter?: boolean;
};

/** Scroll body with optional flow breadcrumb, pinned overview, and action footer. */
export function DepositModalLayout({
  header,
  flowOverview,
  scroll,
  overview,
  footer,
  footerDisabled = false,
  className,
  bodyClassName,
  footerClassName,
  splitFooter = false,
}: DepositModalLayoutProps) {
  const footerNode = footer ? (
    <div
      className={cn(
        ANCHOR_MODAL_FOOTER_WRAPPER,
        footerDisabled && "pointer-events-none opacity-60",
        footerClassName,
      )}
    >
      {footer}
    </div>
  ) : null;

  if (splitFooter) {
    return (
      <div className={cn(DEPOSIT_MODAL_LAYOUT_CLASS, className)}>
        <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>
          {header}
          {flowOverview}
          <div className={ANCHOR_MODAL_SCROLL_CLASS}>{scroll}</div>
          {overview ? (
            <div className={DEPOSIT_MODAL_PINNED_BOTTOM_CLASS}>{overview}</div>
          ) : null}
        </div>
        {footerNode}
      </div>
    );
  }

  return (
    <div className={cn(DEPOSIT_MODAL_LAYOUT_CLASS, className)}>
      {header}
      {flowOverview}
      <div className={ANCHOR_MODAL_SCROLL_CLASS}>{scroll}</div>
      {overview || footer ? (
        <div className={DEPOSIT_MODAL_PINNED_BOTTOM_CLASS}>
          {overview}
          {footerNode}
        </div>
      ) : null}
    </div>
  );
}
