import SimpleTooltip from "@/components/SimpleTooltip";
import {
  DASHBOARD_POSITIONS_VALUE_TEXT_CLASS,
  DASHBOARD_YIELD_COL_BOOST_CLASSNAME,
  DASHBOARD_YIELD_COL_CENTER_NUMERIC_CLASSNAME,
  DASHBOARD_YIELD_COL_NUMERIC_CLASSNAME,
} from "./dashboardRowListStyles";

function HeaderTipLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <SimpleTooltip label={tip} className="cursor-help">
      <span className="inline-flex max-w-full items-center gap-1">
        <span className="truncate">{label}</span>
        <span className="shrink-0 normal-case text-[#1E4775]/35">ⓘ</span>
      </span>
    </SimpleTooltip>
  );
}

/** Centers header label over a representative value width (MV ownership, yield pool %). */
export function DashboardYieldCenteredMetricHeader({
  label,
  tip,
  ghostValue,
}: {
  label: string;
  tip: string;
  ghostValue: string;
}) {
  return (
    <div className={DASHBOARD_YIELD_COL_CENTER_NUMERIC_CLASSNAME}>
      <div className="relative inline-flex max-w-full">
        <span
          className={`${DASHBOARD_POSITIONS_VALUE_TEXT_CLASS} invisible whitespace-nowrap tabular-nums`}
          aria-hidden
        >
          {ghostValue}
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-center">
          <HeaderTipLabel label={label} tip={tip} />
        </span>
      </div>
    </div>
  );
}

/** Centers Boost header over typical badge footprint. */
export function DashboardYieldBoostColumnHeader({ tip }: { tip: string }) {
  return (
    <div className={DASHBOARD_YIELD_COL_BOOST_CLASSNAME}>
      <div className="relative inline-flex max-w-full">
        <span
          className="invisible whitespace-nowrap rounded-md border border-transparent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          aria-hidden
        >
          2.83×
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-center">
          <HeaderTipLabel label="Boost" tip={tip} />
        </span>
      </div>
    </div>
  );
}

/** Right-aligned numeric header — full column width so values line up. */
export function DashboardYieldNumericHeader({
  label,
  tip,
}: {
  label: string;
  tip?: string;
}) {
  return (
    <div className={DASHBOARD_YIELD_COL_NUMERIC_CLASSNAME}>
      {tip ? (
        <span className="flex w-full min-w-0 items-center justify-end">
          <HeaderTipLabel label={label} tip={tip} />
        </span>
      ) : (
        <span className="w-full truncate text-right">{label}</span>
      )}
    </div>
  );
}
