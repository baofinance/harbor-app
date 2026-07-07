import { HarborPageShell } from "@/components/shared/HarborPageShell";
import { IndexPageTitleSection } from "@/components/shared/IndexPageTitleSection";
import { TideDashboard, ProtocolRevenueJourney } from "@/components/tide";
import { TIDE_CONFIG } from "@/config/tide";

export default function TidePage() {
  return (
    <HarborPageShell mainClassName="pb-8">
      <IndexPageTitleSection
        title="$TIDE"
        subtitle={
          <>
            Preview your allocation · airdrop{" "}
            {TIDE_CONFIG.airdropClaimScheduleLabel}
          </>
        }
      />

      <TideDashboard />

      <ProtocolRevenueJourney />
    </HarborPageShell>
  );
}
