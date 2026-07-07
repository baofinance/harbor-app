"use client";

import { useEffect, useRef, useState } from "react";

export type UseAnimatedNumberOptions = {
  durationMs?: number;
  disabled?: boolean;
};

export function useAnimatedNumber(
  target: number,
  { durationMs = 800, disabled = false }: UseAnimatedNumberOptions = {},
): number {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef({ value: target, time: 0 });

  useEffect(() => {
    if (disabled || !Number.isFinite(target)) {
      setDisplay(target);
      return;
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setDisplay(target);
      return;
    }

    const from = display;
    startRef.current = { value: from, time: performance.now() };

    const tick = (now: number) => {
      const elapsed = now - startRef.current.time;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (target - from) * eased;
      setDisplay(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from last rendered value
  }, [target, durationMs, disabled]);

  return display;
}
