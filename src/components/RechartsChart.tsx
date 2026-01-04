import {
 AreaChart,
 Area,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
} from "recharts";
import type { PriceDataPoint } from "../config/contracts";

interface RechartsChartProps {
 data: PriceDataPoint[];
 formatTimestamp: (timestamp: number) => string;
 formatTooltipTimestamp: (timestamp: number) => string;
 dataKey?: string;
 unit?: string;
}

const CustomTooltip = ({
 active,
 payload,
 label,
 formatTooltipTimestamp,
 unit,
}: any) => {
 if (active && payload && payload.length) {
 const value = typeof payload?.[0]?.value === "number" ? payload[0].value : Number(payload?.[0]?.value);
 const formattedValue =
   unit === "$"
     ? `$${Number.isFinite(value) ? value.toFixed(2) : "-"}`
     : `${Number.isFinite(value) ? value.toFixed(4) : "-"}${unit || ""}`;
 return (
 <div className="bg-[#0c0c0c] p-4 shadow-lg">
 <p className="text-sm text-white/80">{formatTooltipTimestamp(label)}</p>
 <p className="text-lg font-bold text-[#1E4775]">
 {formattedValue}
 <span className="text-xs text-white/50 ml-1">{unit === "$" ? "Price" : ""}</span>
 </p>
 </div>
 );
 }

 return null;
};

export default function RechartsChart({
 data,
 formatTimestamp,
 formatTooltipTimestamp,
 dataKey = "price",
 unit = "$",
}: RechartsChartProps) {
 return (
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart
 data={data}
 margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
 >
 <defs>
 <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#1E4775" stopOpacity={0.4} />
 <stop offset="95%" stopColor="#1E4775" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid
 strokeDasharray="1 4"
 stroke="#1E4775"
 opacity={0.15}
 vertical={false}
 />
 <XAxis
 dataKey="timestamp"
 stroke="#1E4775"
 opacity={0.35}
 tick={{ fontSize: 12, fill:"#A3A3A3" }}
 tickLine={{ stroke:"#1E4775", opacity: 0.2 }}
 tickFormatter={formatTimestamp}
 />
 <YAxis
 stroke="#1E4775"
 opacity={0.35}
 tick={{ fontSize: 12, fill:"#A3A3A3" }}
 tickLine={{ stroke:"#1E4775", opacity: 0.2 }}
 domain={["auto","auto"]}
  tickFormatter={(value) =>
    unit === "$"
      ? `$${Number(value).toFixed(2)}`
      : `${value}${unit}`
  }
 />
 <Tooltip
 content={
  <CustomTooltip formatTooltipTimestamp={formatTooltipTimestamp} unit={unit} />
 }
 />
 <Area
 type="monotone"
 dataKey={dataKey}
 stroke="#1E4775"
 strokeWidth={2}
 fillOpacity={1}
 fill="url(#colorPrice)"
 dot={false}
 activeDot={{
 r: 5,
 strokeWidth: 2,
 fill:"#0c0c0c",
 stroke:"#1E4775",
 }}
 />
 </AreaChart>
 </ResponsiveContainer>
 );
}
