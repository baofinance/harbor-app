/**
 * Chart series colors shared by Earn, Leverage, and Harbor Yield.
 * Chosen so the same line stays readable on light cards and the Robinhood theme.
 * Navy #1E4775 is too close to that dark background, so it is not a series color.
 */

/** ha, hs, and hy. */
export const HARBOR_TOKEN_SERIES_COLOR = "#1F9D6A";

/** Comparison series that is not a harbor token, such as the Leverage pair ratio. */
export const CHART_COMPARISON_SERIES_COLOR = "#FF8A7A";

/** External benchmark, such as the Hyperliquid comparison. */
export const CHART_BENCHMARK_SERIES_COLOR = "#6D5BD0";
