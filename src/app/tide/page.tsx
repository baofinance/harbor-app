import { HarborPageShell } from "@/components/shared/HarborPageShell";
import { TideDashboard, ProtocolRevenueJourney } from "@/components/tide";
import { TideContractLink } from "@/components/tide/TideContractLink";

export default function TidePage() {
  return (
    <HarborPageShell mainClassName="pb-8">
      <div className="flex justify-end pt-4">
        <TideContractLink />
      </div>

      <TideDashboard />

      <ProtocolRevenueJourney />
    </HarborPageShell>
  );
}
