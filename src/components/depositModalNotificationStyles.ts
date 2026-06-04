import type { InfoCalloutTone } from "@/components/InfoCallout";

/**
 * Bell / inline count badge severity (lowest → highest).
 * Heaviest visible notification wins over navy default.
 */
export type DepositModalNotificationSeverity = "navy" | "green" | "amber" | "coral";

const SEVERITY_RANK: Record<DepositModalNotificationSeverity, number> = {
  navy: 0,
  green: 1,
  amber: 2,
  coral: 3,
};

export const depositModalNotificationBadgeClass: Record<
  DepositModalNotificationSeverity,
  string
> = {
  navy: "bg-[#1E4775] text-white",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-800",
  coral: "bg-[#FF8A7A]/20 text-[#FF8A7A]",
};

/** Map InfoCallout tone to badge severity. */
export function infoCalloutToneToNotificationSeverity(
  tone?: InfoCalloutTone
): DepositModalNotificationSeverity {
  switch (tone) {
    case "success":
      return "green";
    case "warning":
      return "amber";
    case "pearl":
      return "coral";
    case "info":
    default:
      return "navy";
  }
}

/** Pick badge color from visible notifications (coral > amber > green > navy). */
export function pickHeaviestDepositModalNotificationBadge(
  severities: DepositModalNotificationSeverity[]
): DepositModalNotificationSeverity {
  if (severities.length === 0) return "navy";
  return severities.reduce(
    (heaviest, severity) =>
      SEVERITY_RANK[severity] > SEVERITY_RANK[heaviest] ? severity : heaviest,
    "navy"
  );
}
