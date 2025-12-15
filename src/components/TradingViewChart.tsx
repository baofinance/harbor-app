"use client";

import { useEffect, useRef } from "react";

declare global {
 interface Window {
 TradingView: any;
 }
}

interface TradingViewChartProps {
 symbol: string;
 theme?:"dark" |"light";
}

export default function TradingViewChart({
 symbol,
 theme ="dark",
}: TradingViewChartProps) {
 const container = useRef<HTMLDivElement>(null);

 useEffect(() => {
 // Load TradingView widget script
 const script = document.createElement("script");
 script.src ="https://s3.tradingview.com/tv.js";
 script.async = true;
 script.onload = () => {
 if (container.current && window.TradingView) {
 new window.TradingView.widget({
 container_id: container.current.id,
 symbol: symbol,
 interval:"D",
 timezone:"Etc/UTC",
 theme: theme,
 style:"1",
 locale:"en",
 toolbar_bg:"#1A1A1A",
 enable_publishing: false,
 hide_top_toolbar: false,
 hide_legend: false,
 save_image: false,
 backgroundColor:"#0A0A0A",
 gridColor:"rgba(74, 124, 89, 0.1)",
 width:"100%",
 height:"100%",
 });
 }
 };
 document.head.appendChild(script);

 return () => {
 script.remove();
 };
 }, [symbol, theme]);

 return (
 <div className="w-full h-full bg-[#0A0A0A]">
 <div id="tradingview_widget" ref={container} className="w-full h-full" />
 </div>
 );
}
