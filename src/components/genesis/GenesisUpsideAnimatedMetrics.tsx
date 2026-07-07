"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useMotionValue, useSpring } from "motion/react";
import { formatUsdRange } from "@/utils/maidenVoyageUpsideBenchmarks";

const SPRING = { damping: 28, stiffness: 140 };

type GenesisUpsideAnimatedNumberProps = {
  value: number;
  format: (value: number) => string;
  className?: string;
};

export function GenesisUpsideAnimatedNumber({
  value,
  format,
  className = "",
}: GenesisUpsideAnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, SPRING);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      motionValue.set(value);
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    motionValue.set(value);
  }, [value, motionValue, format]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) ref.current.textContent = format(latest);
    });
  }, [springValue, format]);

  return <span className={className} ref={ref} />;
}

type GenesisUpsideAnimatedUsdRangeProps = {
  lowUsd: number;
  highUsd: number;
  approximate?: boolean;
  className?: string;
  suffix?: ReactNode;
};

export function GenesisUpsideAnimatedUsdRange({
  lowUsd,
  highUsd,
  approximate = false,
  className = "",
  suffix = "",
}: GenesisUpsideAnimatedUsdRangeProps) {
  const lowRef = useRef<HTMLSpanElement>(null);
  const highRef = useRef<HTMLSpanElement>(null);
  const lowMotion = useMotionValue(lowUsd);
  const highMotion = useMotionValue(highUsd);
  const lowSpring = useSpring(lowMotion, SPRING);
  const highSpring = useSpring(highMotion, SPRING);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lowMotion.set(lowUsd);
      highMotion.set(highUsd);
      syncRangeText(lowRef.current, highRef.current, lowUsd, highUsd, approximate);
      return;
    }
    lowMotion.set(lowUsd);
    highMotion.set(highUsd);
  }, [lowUsd, highUsd, lowMotion, highMotion, approximate]);

  useEffect(() => {
    const unsubLow = lowSpring.on("change", (latestLow) => {
      syncRangeText(
        lowRef.current,
        highRef.current,
        latestLow,
        highSpring.get(),
        approximate,
      );
    });
    const unsubHigh = highSpring.on("change", (latestHigh) => {
      syncRangeText(
        lowRef.current,
        highRef.current,
        lowSpring.get(),
        latestHigh,
        approximate,
      );
    });
    return () => {
      unsubLow();
      unsubHigh();
    };
  }, [lowSpring, highSpring, approximate]);

  const formatted = formatUsdRange(lowUsd, highUsd, { approximate });
  const prefix = approximate && formatted.startsWith("≈ ") ? "≈ " : "";
  const rangeBody = prefix ? formatted.slice(2) : formatted;

  if (rangeBody.includes("–")) {
    const [lowPart = "", highPart = ""] = rangeBody.replace(/^\$/, "").split("–");
    return (
      <span className={className}>
        {prefix}
        <span>$</span>
        <span ref={lowRef}>{lowPart}</span>
        <span>–</span>
        <span ref={highRef}>{highPart}</span>
        {suffix}
      </span>
    );
  }

  return (
    <span className={className}>
      {formatted}
      {suffix}
    </span>
  );
}

function syncRangeText(
  lowEl: HTMLSpanElement | null,
  highEl: HTMLSpanElement | null,
  lowUsd: number,
  highUsd: number,
  approximate: boolean,
) {
  const formatted = formatUsdRange(lowUsd, highUsd, { approximate });
  const body = approximate && formatted.startsWith("≈ ")
    ? formatted.slice(2)
    : formatted;

  if (!body.includes("–")) {
    if (lowEl) lowEl.textContent = body.replace(/^\$/, "");
    if (highEl) highEl.textContent = "";
    return;
  }

  const [lowPart = "", highPart = ""] = body.replace(/^\$/, "").split("–");
  if (lowEl) lowEl.textContent = lowPart;
  if (highEl) highEl.textContent = highPart;
}
