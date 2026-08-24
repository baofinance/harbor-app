/** Position value color in the Sail market dropdown trigger / options. */
export type SailDropdownPositionTone = "up" | "down" | "pending";

export function resolveSailDropdownPositionTone(
  unrealizedPnL: number,
  isLoading: boolean,
): SailDropdownPositionTone {
  if (isLoading) return "pending";
  if (unrealizedPnL > 0) return "up";
  if (unrealizedPnL < 0) return "down";
  return "pending";
}

export function sailDropdownPositionToneClass(
  tone: SailDropdownPositionTone | undefined,
): string {
  switch (tone) {
    case "up":
      return "text-[#4A9784]";
    case "down":
      return "text-[#c45c4e]";
    case "pending":
    default:
      return "text-[#1E4775]";
  }
}
