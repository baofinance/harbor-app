import { describe, expect, it } from "vitest";
import {
  deriveFlywheelStage,
  isPolTargetReached,
  isTreasuryTargetReached,
} from "./tideFlywheelStage";

describe("deriveFlywheelStage", () => {
  it("returns treasury when below target or unknown", () => {
    expect(deriveFlywheelStage(null, null)).toBe("treasury");
    expect(deriveFlywheelStage(10, 5)).toBe("treasury");
    expect(deriveFlywheelStage(29.9, 20)).toBe("treasury");
  });

  it("returns pol when treasury target met but POL below target", () => {
    expect(deriveFlywheelStage(30, null)).toBe("pol");
    expect(deriveFlywheelStage(34, 8)).toBe("pol");
  });

  it("returns burn when both targets met", () => {
    expect(deriveFlywheelStage(30, 15)).toBe("burn");
    expect(deriveFlywheelStage(40, 20)).toBe("burn");
  });
});

describe("target helpers", () => {
  it("detects treasury target reached", () => {
    expect(isTreasuryTargetReached(null)).toBe(false);
    expect(isTreasuryTargetReached(29.99)).toBe(false);
    expect(isTreasuryTargetReached(30)).toBe(true);
  });

  it("detects POL target reached", () => {
    expect(isPolTargetReached(14.9)).toBe(false);
    expect(isPolTargetReached(15)).toBe(true);
  });
});
