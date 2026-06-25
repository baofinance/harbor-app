import { describe, expect, it } from "vitest";
import {
  buildUpsideSliderTrackPresets,
  upsideDepositToSliderPosition,
  upsideDepositToTrackRatio,
  upsideSliderPositionToDeposit,
} from "./maidenVoyageUpsideSlider";

const MIN = 0;
const PIVOT = 5_000;
const CAP = 50_000;

describe("maidenVoyageUpsideSlider", () => {
  it("places min, pivot, and cap at 0%, 50%, and 100%", () => {
    expect(upsideDepositToTrackRatio(MIN, MIN, CAP, PIVOT)).toBeCloseTo(0, 5);
    expect(upsideDepositToTrackRatio(PIVOT, MIN, CAP, PIVOT)).toBeCloseTo(
      0.5,
      5,
    );
    expect(upsideDepositToTrackRatio(CAP, MIN, CAP, PIVOT)).toBeCloseTo(1, 5);
  });

  it("places $2.5K at 25% on the first half of the track", () => {
    const ratio = upsideDepositToTrackRatio(2_500, MIN, CAP, PIVOT);
    expect(ratio).toBeCloseTo(0.25, 5);
  });

  it("builds start, pivot, and cap track presets", () => {
    expect(buildUpsideSliderTrackPresets(MIN, PIVOT, CAP)).toEqual([
      MIN,
      PIVOT,
      CAP,
    ]);
  });

  it("round-trips preset values through slider positions", () => {
    for (const preset of [MIN, PIVOT, CAP]) {
      const position = upsideDepositToSliderPosition(preset, MIN, CAP, PIVOT);
      const restored = upsideSliderPositionToDeposit(position, MIN, CAP, PIVOT);
      expect(restored).toBe(preset);
    }
  });
});
