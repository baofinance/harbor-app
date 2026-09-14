import { describe, expect, it } from "vitest";
import type { DefinedMarket } from "@/config/markets";
import type { SailContractReads } from "@/types/sail";
import { filterSailTableMarkets } from "./sailActiveMarkets";

const liveMarket = {
  leveragedToken: true,
  sailActive: true,
} as unknown as DefinedMarket;

const soonMarket = {
  leveragedToken: true,
  sailActive: "soon",
} as unknown as DefinedMarket;

describe("filterSailTableMarkets", () => {
  it("keeps live markets before reads resolve so selection is not soon-only", () => {
    const markets: [string, DefinedMarket][] = [
      ["soon-eth", soonMarket],
      ["live-btc", liveMarket],
    ];
    const idToIndex = new Map([
      ["soon-eth", 0],
      ["live-btc", 1],
    ]);
    const offsets = new Map([
      [0, 0],
      [1, 10],
    ]);

    const filtered = filterSailTableMarkets(
      markets,
      idToIndex,
      offsets,
      undefined,
      [],
      []
    );

    expect(filtered.map(([id]) => id)).toEqual(["soon-eth", "live-btc"]);
  });

  it("requires collateral for live markets once reads exist", () => {
    const markets: [string, DefinedMarket][] = [
      ["soon-eth", soonMarket],
      ["live-btc", liveMarket],
      ["empty-live", liveMarket],
    ];
    const idToIndex = new Map([
      ["soon-eth", 0],
      ["live-btc", 1],
      ["empty-live", 2],
    ]);
    const offsets = new Map([
      [0, 0],
      [1, 10],
      [2, 20],
    ]);

    const reads = {
      13: { result: 1n }, // live-btc collateral slot (base 10 + 3)
      23: { result: 0n }, // empty-live collateral
    } as unknown as SailContractReads;

    const filtered = filterSailTableMarkets(
      markets,
      idToIndex,
      offsets,
      reads,
      [],
      []
    );

    expect(filtered.map(([id]) => id)).toEqual(["soon-eth", "live-btc"]);
  });
});
