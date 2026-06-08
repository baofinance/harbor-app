"use client";

import { ConnectWallet } from "@/components/Wallet";
import {
  DASHBOARD_NOTICE_PANEL_CLASS,
  DASHBOARD_NOTICE_PANEL_INNER_CLASS,
} from "./dashboardStyles";

export function DashboardConnectNotice() {
  return (
    <div className={DASHBOARD_NOTICE_PANEL_CLASS}>
      <div className={DASHBOARD_NOTICE_PANEL_INNER_CLASS}>
        <p>Connect your wallet to view positions and yield share.</p>
        <div className="shrink-0">
          <ConnectWallet />
        </div>
      </div>
    </div>
  );
}
