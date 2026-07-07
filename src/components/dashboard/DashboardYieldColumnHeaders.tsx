import { DashboardMetricHeaderLabel } from "./DashboardMetricLabel";
import { yieldMetricCopy } from "./dashboardMetricCopy";
import {
  DASHBOARD_POSITIONS_VALUE_TEXT_CLASS,
  DASHBOARD_YIELD_COL_BOOST_CLASSNAME,
  DASHBOARD_YIELD_COL_CENTER_NUMERIC_CLASSNAME,
} from "./dashboardRowListStyles";

/** Centers header label over a representative value width (MV ownership, yield pool %). */
export function DashboardYieldCenteredMetricHeader({
  label,
  tip,
  ghostValue,
}: {
  label: string;
  tip?: string;
  ghostValue: string;
}) {
  const labelNode = (
    <DashboardMetricHeaderLabel label={label} tip={tip} />
  );

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
          {labelNode}
        </span>
      </div>
    </div>
  );
}

/** Centers Boost header over typical badge footprint. */
export function DashboardYieldBoostColumnHeader() {
  const { label, tip } = yieldMetricCopy("boost");

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
          <DashboardMetricHeaderLabel label={label} tip={tip} />
        </span>
      </div>
    </div>
  );
}
