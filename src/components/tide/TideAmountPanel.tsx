"use client";

import type { ReactNode } from "react";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import {
  TIDE_INSET_LIGHT_AMOUNT_SM_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS,
  TIDE_INSET_LIGHT_LABEL_CLASS,
} from "./tideCardStyles";

export type TideAmountPanelProps = {
  label: string;
  amountTokens: number;
  unit?: string;
  insetClassName?: string;
  labelClassName?: string;
  amountClassName?: string;
  unitClassName?: string;
  headerRight?: ReactNode;
  labelAdornment?: ReactNode;
  amountAdornment?: ReactNode;
  footer?: ReactNode;
  layout?: "row" | "stack";
};

export function TideAmountPanel({
  label,
  amountTokens,
  unit = "TIDE",
  insetClassName,
  labelClassName = TIDE_INSET_LIGHT_LABEL_CLASS,
  amountClassName = TIDE_INSET_LIGHT_AMOUNT_SM_CLASS,
  unitClassName = TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS,
  headerRight,
  labelAdornment,
  amountAdornment,
  footer,
  layout = "row",
}: TideAmountPanelProps) {
  const amountNode = (
    <div className="flex items-center gap-1.5">
      <p className={amountClassName}>
        {formatTideTokenAmount(amountTokens)}{" "}
        <span className={unitClassName}>{unit}</span>
      </p>
      {amountAdornment}
    </div>
  );

  if (layout === "stack") {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <p className={labelClassName}>{label}</p>
        <div className={insetClassName ? `w-full px-4 py-3 ${insetClassName}` : "w-full"}>
          {headerRight ? <div className="flex justify-end">{headerRight}</div> : null}
          <div className={headerRight ? "mt-2" : undefined}>{amountNode}</div>
          {footer}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <p className={labelClassName}>{label}</p>
        {labelAdornment}
      </div>
      {amountNode}
    </div>
  );
}
