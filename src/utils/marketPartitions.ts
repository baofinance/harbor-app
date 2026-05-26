import { isMarketArchived } from "@/config/markets";

/** Split market entries into active (non-archived) and archived lists. */
export function partitionMarketsByArchived<T extends [string, unknown]>(
  entries: T[]
): { active: T[]; archived: T[] } {
  const active: T[] = [];
  const archived: T[] = [];
  for (const entry of entries) {
    if (isMarketArchived(entry[1])) {
      archived.push(entry);
    } else {
      active.push(entry);
    }
  }
  return { active, archived };
}
