import { useEffect, useState, useMemo } from "react";
import type { PriceDataPoint } from "../config/contracts";
import { markets } from "../config/markets";
import { mergeChartData, useSailPriceHistory } from "../hooks/useSailPriceHistory";
import { useOraclePriceHistory } from "../hooks/useOraclePriceHistory";
import RechartsChart from "./RechartsChart";

interface PriceChartProps {
 tokenType:"LONG" |"STEAMED";
 selectedToken: string;
 marketId: string;
}

export default function PriceChart({
 tokenType,
 selectedToken,
 marketId,
}: PriceChartProps) {
 const [timeRange, setTimeRange] = useState<"1D" |"1W" |"1M">("1M");
  const debug = typeof window !== "undefined" && process.env.NODE_ENV !== "production";

 // Get leveraged token address for subgraph query
 const leveragedTokenAddress = markets[marketId]?.addresses?.leveragedToken as string | undefined;

 // Calculate daysBack based on time range (add 1 day buffer to ensure we have enough data)
 const daysBack = useMemo(() => {
   switch (timeRange) {
     case "1D":
       return 2; // 1 day + 1 day buffer
     case "1W":
       return 8; // 7 days + 1 day buffer
     case "1M":
     default:
       return 31; // 30 days + 1 day buffer
   }
 }, [timeRange]);

 // Use subgraph for leveraged tokens (SAIL), oracle for pegged tokens
 const {
   pricePoints: sailPricePoints,
   hourlySnapshots,
   isLoading: isSailLoading,
   error: sailError,
 } = useSailPriceHistory({
 tokenAddress: leveragedTokenAddress || "",
 daysBack: daysBack,
 enabled: tokenType ==="STEAMED" && !!leveragedTokenAddress,
 });

 const { priceHistory: oraclePriceHistory, isLoading: isOracleLoading } =
 useOraclePriceHistory(marketId);

 // Convert subgraph (events + hourly snapshots) to a continuous PriceDataPoint series.
 const leveragedPriceHistory: PriceDataPoint[] = useMemo(() => {
   const merged = mergeChartData(sailPricePoints, hourlySnapshots);
   return merged.map((point) => ({
     timestamp: point.timestamp,
     price: point.priceUSD,
     type: point.source === "event" ? "mint" : "oracle",
     tokenAmount: BigInt(0),
     collateralAmount: BigInt(0),
   }));
 }, [sailPricePoints, hourlySnapshots]);

 useEffect(() => {
   if (!debug) return;
   if (tokenType !== "STEAMED") return;
   // eslint-disable-next-line no-console
   console.log("[PriceChart] STEAMED history", {
     marketId,
     selectedToken,
     leveragedTokenAddress,
     pricePoints: sailPricePoints.length,
     hourlySnapshots: hourlySnapshots.length,
     mergedPoints: leveragedPriceHistory.length,
     sailError,
   });
 }, [
   debug,
   tokenType,
   marketId,
   selectedToken,
   leveragedTokenAddress,
   sailPricePoints.length,
   hourlySnapshots.length,
   leveragedPriceHistory.length,
   sailError,
 ]);

 const priceHistory =
 tokenType ==="LONG" ? oraclePriceHistory : leveragedPriceHistory;
 const isLoading = tokenType ==="LONG" ? isOracleLoading : isSailLoading;

 // Filter data based on time range
 const filteredData = useMemo(() => {
   if (!priceHistory || priceHistory.length === 0) return [];
   
   const now = Math.floor(Date.now() / 1000); // Current time in seconds
   const pointTime = (point: PriceDataPoint) => point.timestamp; // Already in seconds
   
   switch (timeRange) {
     case "1D": {
       const oneDayAgo = now - (24 * 60 * 60); // 24 hours ago in seconds
       return priceHistory.filter((point) => pointTime(point) >= oneDayAgo);
     }
     case "1W": {
       const oneWeekAgo = now - (7 * 24 * 60 * 60); // 7 days ago in seconds
       return priceHistory.filter((point) => pointTime(point) >= oneWeekAgo);
     }
     case "1M":
     default:
       return priceHistory;
   }
 }, [priceHistory, timeRange]);

 const formatTimestamp = (timestamp: number) => {
 const date = new Date(timestamp * 1000);
 return timeRange ==="1D"
 ? date.toLocaleTimeString()
 : date.toLocaleDateString();
 };

 const formatTooltipTimestamp = (timestamp: number) => {
 const date = new Date(timestamp * 1000);
 return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
 };

 return (
 <div className="relative z-10 h-full">
 <div className="flex items-center justify-end mb-3">
 <div className="flex items-center gap-4">
 <div className="text-sm text-[#1E4775]/60">
 {isLoading ?"Loading..." : `${filteredData.length} data points`}
 </div>
 <div className="flex gap-4">
 {(["1D","1W","1M"] as const).map((range) => (
 <button
 key={range}
 onClick={() => setTimeRange(range)}
 className={`px-2 py-1 text-xs ${
 timeRange === range
 ?"bg-[#1E4775] text-white"
   :"bg-[#eef1f7] text-[#4b5a78] hover:bg-[#1E4775]/10"
 }`}
 >
 {range}
 </button>
 ))}
 </div>
 </div>
 </div>
 <div className="h-[calc(100%-2rem)]">
 {isLoading ? (
 <div className="flex items-center justify-center h-full text-[#1E4775]/60">
 Loading price history...
 </div>
 ) : filteredData.length === 0 ? (
 <div className="flex items-center justify-center h-full text-[#1E4775]/60">
 {tokenType === "STEAMED" && sailError
   ? "Price data unavailable (subgraph error)."
   : "No price data available"}
 </div>
 ) : (
 <RechartsChart
 data={filteredData}
 formatTimestamp={formatTimestamp}
 formatTooltipTimestamp={formatTooltipTimestamp}
 dataKey="price"
 unit="$"
 />
 )}
 </div>
 </div>
 );
}
