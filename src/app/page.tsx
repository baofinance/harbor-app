import { redirect } from "next/navigation";
import { markets, isGenesisActive } from "@/config/markets";

export default function HomePage() {
  // Check if any genesis market is currently active (genesis has not ended)
  const hasActiveGenesis = Object.values(markets).some((market) => {
    // Only check markets that have a genesis address configured
    const hasGenesisAddress =
      (market as any).addresses?.genesis &&
      (market as any).addresses?.genesis !==
        "0x0000000000000000000000000000000000000000" &&
      (market as any).status !== "coming-soon";

    if (!hasGenesisAddress) return false;

    return isGenesisActive(market);
  });

  // Redirect to genesis if any market's genesis is active, otherwise to anchor
  if (hasActiveGenesis) {
    redirect("/genesis");
  } else {
    redirect("/anchor");
  }
}
