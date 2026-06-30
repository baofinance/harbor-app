import { HarborPageShell } from "@/components/shared/HarborPageShell";
import { IndexPageTitleSection } from "@/components/shared/IndexPageTitleSection";
import { TideDashboard, TideValueFlywheel } from "@/components/tide";

export default function TidePage() {
  return (
    <HarborPageShell mainClassName="pb-8">
      <IndexPageTitleSection
        title="$TIDE"
        subtitle={<>Preview your allocation · airdrop June 2026</>}
      />

      <TideDashboard />

      <TideValueFlywheel />
    </HarborPageShell>
  );
}
