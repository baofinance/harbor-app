import {
  ArrowPathIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import {
  SAIL_ADVANCED_BODY,
  SAIL_ADVANCED_LABEL,
  SAIL_ADVANCED_PANEL,
  SAIL_ADVANCED_SHELL,
} from "./sailAdvancedStyles";

function FooterColumn({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BanknotesIcon;
  title: string;
  body: string;
}) {
  return (
    <div className={`${SAIL_ADVANCED_PANEL} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-white/75" aria-hidden />
        <h3 className={`${SAIL_ADVANCED_LABEL} text-white/85`}>{title}</h3>
      </div>
      <p className={SAIL_ADVANCED_BODY}>{body}</p>
    </div>
  );
}

export function SailMarketInfoFooter() {
  return (
    <footer className={`${SAIL_ADVANCED_SHELL} px-3 py-3 sm:px-4`}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <FooterColumn
          icon={ShieldCheckIcon}
          title="How Sail Leverage Works"
          body="Sail tokens give amplified exposure through variable leverage that auto-rebalances at protocol thresholds — no funding fees or manual margin calls."
        />
        <FooterColumn
          icon={BanknotesIcon}
          title="Why Use Sail"
          body="Express directional views with composable tokens, transparent on-chain fees, and redemption into collateral at any time."
        />
        <FooterColumn
          icon={StarIcon}
          title="Earn Sail Marks"
          body="Deposits earn Ledger marks over time (10 per dollar per day baseline). Marks convert into future TIDE rewards and governance power."
        />
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/50">
        <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden />
        Positions rebalance automatically to protect against liquidation
      </p>
    </footer>
  );
}
