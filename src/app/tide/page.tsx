import { HarborPageShell } from "@/components/shared/HarborPageShell";
import { TideDashboard, ProtocolRevenueJourney } from "@/components/tide";

export default function TidePage() {
  return (
    <HarborPageShell mainClassName="pb-8">
      <TideDashboard />

      <ProtocolRevenueJourney />
    </HarborPageShell>
  );
}
