import { useState, useEffect, useRef } from "react";

/**
 * Returns an array of booleans that become true in sequence, staggering the
 * "ready" state by `intervalMs` each. Use to prevent many useContractReads
 * hooks from firing their initial fetch simultaneously (which causes 5-10
 * multicall eth_calls in rapid succession).
 *
 * @param count Number of staggered cohorts
 * @param intervalMs Delay between each cohort (default: 50ms)
 * @returns Array where [0] is true immediately, [1] after intervalMs, etc.
 */
export function useStaggeredReady(
  count: number,
  intervalMs: number = 50
): boolean[] {
  const [lastReady, setLastReady] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (count <= 1) return;

    intervalRef.current = setInterval(() => {
      setLastReady((prev) => {
        if (prev >= count - 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [count, intervalMs]);

  return Array.from({ length: count }, (_, i) => i <= lastReady);
}
