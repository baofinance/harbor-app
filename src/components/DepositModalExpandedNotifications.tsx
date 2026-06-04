"use client";

import { ChevronLeft } from "lucide-react";

type DepositModalExpandedNotificationsProps = {
  onCollapse: () => void;
  children: React.ReactNode;
};

/** Notification drawer between title bar and tabs. */
export function DepositModalExpandedNotifications({
  onCollapse,
  children,
}: DepositModalExpandedNotificationsProps) {
  return (
    <div className="shrink-0 border-b border-[#1E4775]/15 bg-[#f8fafc]">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <button
          type="button"
          onClick={onCollapse}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#1E4775]/70 transition hover:bg-[#1E4775]/10 hover:text-[#1E4775]"
          aria-label="Collapse notifications"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="text-sm font-semibold text-[#1E4775]">Notifications</span>
      </div>
      <div className="space-y-2 px-3 pb-3">{children}</div>
    </div>
  );
}
