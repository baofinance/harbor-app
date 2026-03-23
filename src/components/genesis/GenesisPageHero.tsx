/**
 * Full page hero: title section + three intro cards (same as `GenesisHeaderSummary`).
 * Prefer composing `GenesisPageTitleSection` + `GenesisHeroIntroCards` on the page when
 * Basic vs Extended splits differ.
 */
import { GenesisHeaderSummary } from "@/components/GenesisHeaderSummary";

export function GenesisPageHero() {
  return <GenesisHeaderSummary />;
}
