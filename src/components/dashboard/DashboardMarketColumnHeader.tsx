import {
  DASHBOARD_MARKET_ICON_PX,
  DASHBOARD_POSITIONS_COL_MARKET_CLASSNAME,
  DASHBOARD_POSITIONS_VALUE_TEXT_CLASS,
} from "./dashboardRowListStyles";

/** Representative label — sizes the icon+name block for header centering. */
const MARKET_HEADER_GHOST_LABEL = "fxUSD - BTC";

type DashboardMarketColumnHeaderProps = {
  /** Positions rows include a 20px token icon before the label; yield rows do not. */
  showIcon?: boolean;
};

export function DashboardMarketColumnHeader({
  showIcon = true,
}: DashboardMarketColumnHeaderProps) {
  return (
    <div className={DASHBOARD_POSITIONS_COL_MARKET_CLASSNAME}>
      <div className="relative inline-flex max-w-full items-center gap-2">
        {showIcon ? (
          <span
            className="shrink-0"
            style={{ width: DASHBOARD_MARKET_ICON_PX }}
            aria-hidden
          />
        ) : null}
        <span
          className={`${DASHBOARD_POSITIONS_VALUE_TEXT_CLASS} invisible whitespace-nowrap`}
          aria-hidden
        >
          {MARKET_HEADER_GHOST_LABEL}
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-center">
          Market
        </span>
      </div>
    </div>
  );
}
