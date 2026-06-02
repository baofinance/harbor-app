"use client";

import { Bell } from "lucide-react";
import {
  type DepositModalNotificationSeverity,
  depositModalNotificationBadgeClass,
} from "@/components/depositModalNotificationStyles";

type DepositModalNotificationBellProps = {
  count?: number;
  active?: boolean;
  onClick: () => void;
  badgeSeverity?: DepositModalNotificationSeverity;
  className?: string;
};

/** Compact bell control in the modal top bar (left of close). */
export function DepositModalNotificationBell({
  count = 0,
  active = false,
  onClick,
  badgeSeverity = "navy",
  className = "",
}: DepositModalNotificationBellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md text-[#1E4775]/70 transition hover:bg-[#1E4775]/8 hover:text-[#1E4775] ${
        active ? "bg-[#1E4775]/10 text-[#1E4775]" : ""
      } ${className}`.trim()}
      aria-expanded={active}
      aria-label={
        count > 0
          ? `Notifications, ${count} alert${count === 1 ? "" : "s"}`
          : "Notifications"
      }
    >
      <Bell className="h-4 w-4" aria-hidden />
      {count > 0 ? (
        <span
          className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${depositModalNotificationBadgeClass[badgeSeverity]}`}
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}
