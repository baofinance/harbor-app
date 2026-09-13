import {
  ArrowPathIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import {
  ANCHOR_ADVANCED_FROSTED_CARD,
  ANCHOR_ADVANCED_LIGHT_BODY,
  ANCHOR_ADVANCED_LIGHT_SECTION_TITLE,
  ANCHOR_ADVANCED_SHELL,
} from "./anchorAdvancedStyles";

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
    <div className={`${ANCHOR_ADVANCED_FROSTED_CARD} p-4 sm:p-5`}>
      <div className="mb-2.5 flex items-center gap-2.5">
        <Icon className="h-5 w-5 shrink-0 text-[#1E4775]/80" aria-hidden />
        <h3 className={ANCHOR_ADVANCED_LIGHT_SECTION_TITLE}>{title}</h3>
      </div>
      <p className={ANCHOR_ADVANCED_LIGHT_BODY}>{body}</p>
    </div>
  );
}

export function AnchorMarketInfoFooter() {
  return (
    <footer className={`${ANCHOR_ADVANCED_SHELL} px-3 py-3 sm:px-4`}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <FooterColumn
          icon={ShieldCheckIcon}
          title="What is an haToken"
          body="haTokens are pegged tokens that track a peg target (ETH, BTC, EUR, and more) while earning protocol yield funded by collateral yield and trading fees."
        />
        <FooterColumn
          icon={BanknotesIcon}
          title="Stability pools"
          body="Deposit haTokens into Collateral or Sail stability pools. Pools help the protocol rebalance by exchanging pegged tokens for collateral or leveraged tokens when needed."
        />
        <FooterColumn
          icon={StarIcon}
          title="Redeem anytime"
          body="haTokens stay redeemable for collateral at the peg-target market price. Deposits also earn Ledger marks over time for future rewards and governance."
        />
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-white/65">
        <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden />
        Yield is paid to stability pools that protect the protocol
      </p>
    </footer>
  );
}
