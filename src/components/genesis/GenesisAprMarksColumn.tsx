"use client";

import { memo } from "react";
import Image from "next/image";
import {
  computeGenesisAprDerivedState,
  type GenesisAprDerivedInput,
} from "@/utils/genesisAprDerived";

export type GenesisAprMarksColumnProps = {
  input: GenesisAprDerivedInput;
  isLoadingMarks: boolean;
  /** Mobile: right-aligned marks next to title; md: centered; lg: centered min-w-0 */
  layout: "mobile" | "md" | "lg";
};

/**
 * Marks + shared APR-derived math for Genesis active rows (replaces three inline IIFEs).
 */
export const GenesisAprMarksColumn = memo(function GenesisAprMarksColumn({
  input,
  isLoadingMarks,
  layout,
}: GenesisAprMarksColumnProps) {
  const apr = computeGenesisAprDerivedState(input);
  const { displayMarks } = apr;

  const marksInner = (
    <>
      {isLoadingMarks ? (
        "..."
      ) : (
        <>
          {displayMarks >= 0
            ? displayMarks.toLocaleString(undefined, {
                maximumFractionDigits: 1,
                minimumFractionDigits: 0,
              })
            : "-"}
          <Image
            src="/icons/marks.png"
            alt="Marks"
            width={16}
            height={16}
            className="inline-block"
          />
        </>
      )}
    </>
  );

  if (layout === "mobile") {
    return (
      <div className="flex-shrink-0 text-right mr-8">
        <div className="text-[#1E4775]/70 text-[10px]">Marks</div>
        <span className="text-[#1E4775] font-semibold text-xs flex items-center justify-end gap-1">
          {marksInner}
        </span>
      </div>
    );
  }

  if (layout === "md") {
    return (
      <div className="text-center">
        <span className="text-[#1E4775] font-semibold text-xs flex items-center justify-center gap-1">
          {marksInner}
        </span>
      </div>
    );
  }

  return (
    <div className="text-center min-w-0">
      <span className="text-[#1E4775] font-semibold text-xs flex items-center justify-center gap-1">
        {marksInner}
      </span>
    </div>
  );
});
