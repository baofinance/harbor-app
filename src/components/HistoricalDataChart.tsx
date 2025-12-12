"use client";

import React, { useState, useMemo, useEffect } from"react";
import {
 AreaChart,
 Area,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
} from"recharts";
import TimeRangeSelector from"./TimeRangeSelector";
import { TimeRange } from"../config/types";
import type { TooltipProps } from"recharts";
import type {
 ValueType,
 NameType,
} from"recharts/types/component/DefaultTooltipContent";

const generateData = (
 timeRange: TimeRange,
 dataType: string,
 marketId: string
) => {
 const now = new Date();
 const data: { timestamp: number; value: number }[] = [];
 let numPoints = 0;
 let interval = 1000 * 60 * 60; // 1 hour

 switch (timeRange) {
 case"1D":
 numPoints = 24;
 break;
 case"1W":
 numPoints = 7 * 24;
 interval = 1000 * 60 * 60;
 break;
 case"1M":
 numPoints = 30;
 interval = 1000 * 60 * 60 * 24; // 1 day
 break;
 case"1Y":
 numPoints = 12;
 interval = 1000 * 60 * 60 * 24 * 30; // 1 month
 break;
 case"ALL":
 numPoints = 48; // e.g. 4 years of monthly data
 interval = 1000 * 60 * 60 * 24 * 30;
 break;
 }

 // Seed the random number generator with the marketId to ensure unique data for each chart
 let seed = marketId
 .split("")
 .reduce((acc, char) => acc + char.charCodeAt(0), 0);
 const random = () => {
 const x = Math.sin(seed++) * 10000;
 return x - Math.floor(x);
 };

 for (let i = numPoints - 1; i >= 0; i--) {
 let value;
 if (dataType ==="apr") {
 value = random() * 5 + 10; // APR between 10-15%
 } else {
 value = random() * 2000000 + 8000000; // Collateral between 8M-10M
 }
 data.push({
 timestamp: now.getTime() - i * interval,
 value: value,
 });
 }
 return data;
};

const CustomTooltip = ({
 active,
 payload,
 label,
 dataType,
}: TooltipProps<ValueType, NameType> & { dataType: string }) => {
 if (active && payload && payload.length) {
 const value = Number(payload[0].value);
 const formattedDate = new Date(Number(label)).toLocaleString("en-US", {
 month:"short",
 day:"numeric",
 year:"numeric",
 hour:"2-digit",
 minute:"2-digit",
 });

 return (
 <div className="bg-[#0c0c0c] p-4 shadow-lg">
 <p className="text-sm text-white/80">{formattedDate}</p>
 <p className="text-lg font-bold text-[#1E4775]">
 {dataType ==="apr"
 ? `${value.toFixed(2)}%`
 : `$${(value / 1_000_000).toFixed(2)}M`}
 </p>
 </div>
 );
 }

 return null;
};

const HistoricalDataChart = ({ marketId }: { marketId: string }) => {
 const [timeRange, setTimeRange] = useState<TimeRange>("1M");
 const [dataType, setDataType] = useState("apr"); //'apr' or'collateral'
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 if (marketId) {
 setIsLoading(false);
 }
 }, [marketId]);

 const data = useMemo(
 () => (marketId ? generateData(timeRange, dataType, marketId) : []),
 [timeRange, dataType, marketId]
 );

 const formatXAxis = (timestamp: number) => {
 const date = new Date(timestamp);
 switch (timeRange) {
 case"1D":
 return date.toLocaleTimeString("en-US", {
 hour:"2-digit",
 minute:"2-digit",
 });
 case"1W":
 case"1M":
 return date.toLocaleDateString("en-US", {
 month:"short",
 day:"numeric",
 });
 case"1Y":
 return date.toLocaleDateString("en-US", { month:"short" });
 case"ALL":
 return date.toLocaleDateString("en-US", { year:"numeric" });
 default:
 return"";
 }
 };

 const formatYAxis = (value: number) => {
 if (dataType ==="apr") {
 return `${value.toFixed(0)}%`;
 } else {
 return `$${(value / 1_000_000).toFixed(0)}M`;
 }
 };

 if (isLoading) {
 return <div>Loading...</div>;
 }

 return (
 <div className="w-full h-full flex flex-col">
 <div className="flex justify-between items-center px-4 pt-2">
 <div className="flex gap-4">
 <button
 onClick={() => setDataType("apr")}
 className={`text-sm font-semibold ${
 dataType ==="apr" ?"text-white" :"text-zinc-400"
 }`}
 >
 Price
 </button>
 <button
 onClick={() => setDataType("collateral")}
 className={`text-sm font-semibold ${
 dataType ==="collateral" ?"text-white" :"text-zinc-400"
 }`}
 >
 Total Collateral
 </button>
 </div>
 <TimeRangeSelector
 selectedRange={timeRange}
 onSelectRange={setTimeRange}
 />
 </div>
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart
 data={data}
 margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
 >
 <defs>
 <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#1E4775" stopOpacity={0.45} />
 <stop offset="95%" stopColor="#1E4775" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid
 strokeDasharray="3 3"
 stroke="#4f46e5"
 opacity={0.12}
 vertical={false}
 />
 <XAxis
 dataKey="timestamp"
 stroke="white"
 opacity={0.5}
 tick={{ fontSize: 12, fill:"#A3A3A3" }}
 tickLine={{ stroke:"#4f46e5", opacity: 0.25 }}
 tickFormatter={formatXAxis}
 padding={{ left: 20, right: 20 }}
 />
 <YAxis
 stroke="white"
 opacity={0.5}
 tick={{ fontSize: 12, fill:"#A3A3A3" }}
 tickLine={{ stroke:"#4f46e5", opacity: 0.25 }}
 tickFormatter={formatYAxis}
 domain={["auto","auto"]}
 />
 <Tooltip content={<CustomTooltip dataType={dataType} />} />
 <Area
 type="monotone"
 dataKey="value"
 stroke="#1E4775"
 strokeWidth={2}
 fillOpacity={1}
 fill="url(#colorValue)"
 dot={false}
 activeDot={{
 r: 5,
 strokeWidth: 2,
 fill:"#1E4775",
 stroke:"#1E4775",
 }}
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 );
};

export default HistoricalDataChart;
