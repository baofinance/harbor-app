"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import {
  depositModalNotificationBadgeClass,
  pickHeaviestDepositModalNotificationBadge,
} from "@/components/depositModalNotificationStyles";
import { HARBOR_FROSTED_LIGHT_CARD } from "@/components/shared/harborFrostedSurfaceStyles";
import { HARBOR_NAV_ICON_BUTTON_CLASS } from "@/components/shared/harborNavStyles";
import { useAppNotificationsOptional } from "@/contexts/AppNotificationsContext";

const AUTO_DISMISS_MS = 10_000;

/** Bell control for the top nav (left of the burger). Always visible; inert when empty. */
export function NavNotificationBell({ className = "" }: { className?: string }) {
  const ctx = useAppNotificationsOptional();
  const source = ctx?.source ?? null;
  const expanded = ctx?.expanded ?? false;
  const toggleExpanded = ctx?.toggleExpanded;
  const count = source?.count ?? 0;
  const hasNotifications = count > 0;

  const badgeSeverity = hasNotifications
    ? pickHeaviestDepositModalNotificationBadge(
        source?.badgeSeverities ?? ["navy"]
      )
    : null;

  return (
    <button
      type="button"
      onClick={hasNotifications ? toggleExpanded : undefined}
      disabled={!hasNotifications}
      className={`relative ${HARBOR_NAV_ICON_BUTTON_CLASS} disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent ${
        hasNotifications && expanded ? "bg-white/20" : ""
      } ${className}`.trim()}
      aria-expanded={hasNotifications ? expanded : undefined}
      aria-controls={hasNotifications ? "app-notifications-panel" : undefined}
      aria-label={
        hasNotifications
          ? `Notifications, ${count} alert${count === 1 ? "" : "s"}`
          : "No notifications"
      }
    >
      <Bell className="size-5" aria-hidden />
      {hasNotifications && badgeSeverity ? (
        <span
          className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ring-2 ring-[#1E4775] ${depositModalNotificationBadgeClass[badgeSeverity]}`}
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}

/** Fixed overlay below the nav — does not shift page layout. Auto-closes after 10s. */
export function AppNotificationsStrip() {
  const ctx = useAppNotificationsOptional();
  const expanded = ctx?.expanded ?? false;
  const sourceId = ctx?.source?.id ?? null;
  const body = ctx?.body;
  const setExpanded = ctx?.setExpanded;
  const [mounted, setMounted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(AUTO_DISMISS_MS / 1000)
  );
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setExpandedRef = useRef(setExpanded);
  setExpandedRef.current = setExpanded;

  const close = useCallback(() => {
    setExpandedRef.current?.(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    if (!expanded || !sourceId) return;

    const openedAt = Date.now();
    setSecondsLeft(Math.ceil(AUTO_DISMISS_MS / 1000));

    tickIntervalRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((AUTO_DISMISS_MS - (Date.now() - openedAt)) / 1000)
      );
      setSecondsLeft(remaining);
    }, 250);

    dismissTimeoutRef.current = setTimeout(() => {
      setExpandedRef.current?.(false);
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [expanded, sourceId]);

  if (!mounted || !ctx?.source || !expanded) return null;

  const { source } = ctx;
  const progressPct = Math.min(
    100,
    Math.max(0, (secondsLeft / (AUTO_DISMISS_MS / 1000)) * 100)
  );

  return createPortal(
    <div
      id="app-notifications-panel"
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center px-4 sm:px-10"
    >
      <div
        className={`pointer-events-auto w-full max-w-[1300px] overflow-hidden rounded-lg shadow-xl ${HARBOR_FROSTED_LIGHT_CARD}`}
      >
          <div
            className="h-0.5 bg-[#1E4775]/10"
            aria-hidden
          >
            <div
              className="h-full bg-[#4A9784]/80 transition-[width] duration-300 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-[#1E4775]/10 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-sm font-semibold text-[#1E4775]">
                Notifications
              </span>
              <span className="text-xs tabular-nums text-[#1E4775]/50">
                closes in {secondsLeft}s
              </span>
            </div>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#1E4775]/70 transition hover:bg-[#1E4775]/10 hover:text-[#1E4775]"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="max-h-[min(50vh,20rem)] space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
            {body}
          </div>
      </div>
    </div>,
    document.body
  );
}
