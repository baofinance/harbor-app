import { useState, useMemo } from "react";
import type { PriceDataPoint } from "../config/contracts";
import { markets } from "../config/markets";
import { useSailPriceHistory } from "../hooks/useSailPriceHistory";
import { useOraclePriceHistory } from "../hooks/useOraclePriceHistory";
import dynamic from "next/dynamic";

const RechartsChart = dynamic(() => import("./RechartsChart"), {
 ssr: false,
});

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

 // Get leveraged token address for subgraph query
 const leveragedTokenAddress = markets[marketId]?.addresses?.leveragedToken as string | undefined;

 // Use subgraph for leveraged tokens (SAIL), oracle for pegged tokens
 const { pricePoints: sailPricePoints, isLoading: isSailLoading } = useSailPriceHistory({
 tokenAddress: leveragedTokenAddress || "",
 daysBack: 30,
 enabled: tokenType ==="STEAMED" && !!leveragedTokenAddress,
 });

 const { priceHistory: oraclePriceHistory, isLoading: isOracleLoading } =
 useOraclePriceHistory(marketId);

 // Convert subgraph price points to PriceDataPoint format
 const leveragedPriceHistory: PriceDataPoint[] = useMemo(() => {
 return sailPricePoints.map((point) => ({
 timestamp: point.timestamp,
 price: point.priceUSD,
 type: point.eventType as "mint" | "redeem" | "oracle",
 tokenAmount: BigInt(0),
 collateralAmount: BigInt(0),
 }));
 }, [sailPricePoints]);

 const priceHistory =
 tokenType ==="LONG" ? oraclePriceHistory : leveragedPriceHistory;
 const isLoading = tokenType ==="LONG" ? isOracleLoading : isSailLoading;

 // Filter data based on time range
 const filteredData = priceHistory.filter((point) => {
 const now = Date.now();
 const pointTime = point.timestamp * 1000;
 switch (timeRange) {
 case"1D":
 return now - pointTime <= 24 * 60 * 60 * 1000;
 case"1W":
 return now - pointTime <= 7 * 24 * 60 * 60 * 1000;
 case"1M":
 default:
 return true;
 }
 });

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
 <div className="flex items-center justify-end mb-4">
 <div className="flex items-center gap-4">
 <div className="text-sm text-white/50">
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
 :"bg-zinc-900/50 text-white/50 hover:text-white hover:bg-[#1E4775]/20"
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
 <div className="flex items-center justify-center h-full text-white/50">
 Loading price history...
 </div>
 ) : filteredData.length === 0 ? (
 <div className="flex items-center justify-center h-full text-white/50">
 No price data available
 </div>
 ) : (
 <RechartsChart
 data={filteredData}
 formatTimestamp={formatTimestamp}
 formatTooltipTimestamp={formatTooltipTimestamp}
 />
 )}
 </div>
 </div>
 );
}
