import React from "react";
import type { TransactionStep } from "./TransactionProgressModal";

interface CompactTransactionProgressRailProps {
  steps: TransactionStep[];
  currentStepIndex: number;
}

/**
 * Middle column: first step shows the **next** transaction (steps[1]) so it
 * doesn’t duplicate the first column; last step matches end; otherwise the
 * active step label.
 */
function getMiddleCaption(
  steps: TransactionStep[],
  currentStepIndex: number,
  allDone: boolean
): string {
  if (steps.length === 0) return "";
  const last = steps.length - 1;
  if (allDone) return steps[last]?.label ?? "";
  if (steps.length === 1) return steps[0]?.label ?? "";
  if (currentStepIndex === 0) return steps[1]?.label ?? "";
  if (currentStepIndex === last) return steps[last]?.label ?? "";
  return steps[currentStepIndex]?.label ?? "";
}

/**
 * Three-node rail: start · current · end. Solid segment start→current, dotted current→end.
 */
export function CompactTransactionProgressRail({
  steps,
  currentStepIndex,
}: CompactTransactionProgressRailProps) {
  if (steps.length === 0) return null;

  const cur = steps[Math.min(currentStepIndex, steps.length - 1)];
  const allDone = steps.every((s) => s.status === "completed");
  const startCaption = steps[0]?.label ?? "";
  const endCaption = steps[steps.length - 1]?.label ?? "";
  const middleCaption = getMiddleCaption(steps, currentStepIndex, allDone);
  const chainStarted =
    currentStepIndex > 0 || (steps[0] && steps[0].status !== "pending");

  const currentErr = cur?.status === "error";
  const currentDone = cur?.status === "completed";

  let centerClass = "border-[#1E4775]/30 bg-white";
  let centerInner: React.ReactNode = null;

  if (currentErr) {
    centerClass = "border-red-500 bg-red-500";
  } else if (currentDone && !allDone) {
    centerClass = "border-green-500 bg-green-500";
  } else if (allDone) {
    centerClass = "border-green-500 bg-green-500";
  } else if (cur?.status === "in_progress") {
    centerClass =
      "border-[#1E4775] bg-[#1E4775] animate-pulse";
    centerInner = (
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    );
  } else if (cur?.status === "pending") {
    centerClass = "border-[#1E4775]/30 bg-white";
    centerInner = (
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1E4775]/40" />
      </span>
    );
  }

  const startClass = chainStarted
    ? "border-green-500 bg-green-500"
    : "border-[#1E4775]/30 bg-white";

  const endClass = allDone
    ? "border-green-500 bg-green-500"
    : "border-[#1E4775]/30 bg-white";

  const solidLineClass = chainStarted ? "bg-green-500" : "bg-[#1E4775]/20";

  return (
    <div
      className="w-full pt-1"
      role="group"
      aria-label="Transaction progress overview"
    >
      <div className="flex w-full items-center">
        <div
          className={`relative h-3 w-3 shrink-0 rounded-full border-2 ${startClass}`}
        />
        <div
          className={`mx-1 h-0.5 min-h-[2px] min-w-[12px] flex-1 ${solidLineClass}`}
        />
        <div
          className={`relative flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 ${centerClass}`}
        >
          {centerInner}
        </div>
        <div className="mx-1 min-h-[2px] min-w-[12px] flex-1 border-t-2 border-dotted border-[#1E4775]/25" />
        <div
          className={`h-3 w-3 shrink-0 rounded-full border-2 ${endClass}`}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-x-1.5 text-center">
        <div
          className="text-[10px] font-medium leading-tight text-[#1E4775] line-clamp-3 min-h-[2.5rem]"
          title={startCaption}
        >
          {startCaption}
        </div>
        <div
          className="text-[10px] font-medium leading-tight text-[#1E4775] line-clamp-3 min-h-[2.5rem]"
          title={middleCaption}
        >
          {middleCaption}
        </div>
        <div
          className="text-[10px] font-medium leading-tight text-[#1E4775] line-clamp-3 min-h-[2.5rem]"
          title={endCaption}
        >
          {endCaption}
        </div>
      </div>
    </div>
  );
}
