/** Narrow wagmi `useContractReads` row for `.result` access without `as any` on the whole array. */
export function readContractRowResult<T>(
  rows: readonly unknown[] | undefined,
  index: number
): T | undefined {
  const row = rows?.[index] as { result?: T } | undefined;
  return row?.result;
}
