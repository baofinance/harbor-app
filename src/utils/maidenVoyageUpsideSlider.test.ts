import { describe, expect, it } from "vitest";
import {
  upsideDepositToSliderPosition,
  upsideDepositToTrackRatio,
  upsideSliderPositionToDeposit,
} from "./maidenVoyageUpsideSlider";

const MIN = 500;
const PIVOT = 5_000;
const MAX = 10_000;

describe("maidenVoyageUpsideSlider", () => {
  it("places min, pivot, and max at 0%, 50%, and 100%", () => {
    expect(upsideDepositToTrackRatio(MIN, MIN, MAX, PIVOT)).toBeCloseTo(0, 5);
    expect(upsideDepositToTrackRatio(PIVOT, MIN, MAX, PIVOT)).toBeCloseTo(
      0.5,
      5,
    );
    expect(upsideDepositToTrackRatio(MAX, MIN, MAX, PIVOT)).toBeCloseTo(1, 5);
  });

  it("places $1K between min and pivot on the first half of the track", () => {
    const ratio = upsideDepositToTrackRatio(1_000, MIN, MAX, PIVOT);
    expect(ratio).toBeGreaterThan(0.1);
    expect(ratio).toBeLessThan(0.25);
  });

  it("round-trips preset values through slider positions", () => {
    for (const preset of [MIN, 1_000, PIVOT, MAX]) {
      const position = upsideDepositToSliderPosition(preset, MIN, MAX, PIVOT);
      const restored = upsideSliderPositionToDeposit(position, MIN, MAX, PIVOT);
      expect(restored).toBe(preset);
    }
  });
});
