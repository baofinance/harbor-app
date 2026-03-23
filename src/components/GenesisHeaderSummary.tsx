import { GenesisHeroIntroCards } from "@/components/genesis/GenesisHeroIntroCards";
import { GenesisPageTitleSection } from "@/components/genesis/GenesisPageTitleSection";

/** Full hero: title + subtitle + three intro cards (Extended layout). */
export const GenesisHeaderSummary = () => {
  return (
    <div className="mb-2">
      <GenesisPageTitleSection />
      <GenesisHeroIntroCards />
    </div>
  );
};
