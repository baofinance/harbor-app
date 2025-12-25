import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch wstETH APR from DeFiLlama Yields API
 * Searches for wstETH or stETH pools from Lido
 * API: https://yields.llama.fi/pools
 */
export function useWstETHAPR(enabled = true) {
  return useQuery({
    queryKey: ["wsteth-apr"],
    queryFn: async () => {
      try {
        // Fetch all pools from DeFiLlama
        const poolsResponse = await fetch("https://yields.llama.fi/pools");
        
        if (!poolsResponse.ok) {
          console.error("[useWstETHAPR] HTTP error:", poolsResponse.status, poolsResponse.statusText);
          throw new Error(`Failed to fetch pools: ${poolsResponse.statusText}`);
        }

        const poolsData = await poolsResponse.json();
        console.log("[useWstETHAPR] Pools data type:", typeof poolsData, Array.isArray(poolsData) ? `array length: ${poolsData.length}` : "not array");
        console.log("[useWstETHAPR] Pools data keys:", poolsData ? Object.keys(poolsData) : "null/undefined");
        
        // DeFiLlama API might return { data: [...] } or just an array
        let poolsArray: any[] = [];
        if (Array.isArray(poolsData)) {
          poolsArray = poolsData;
        } else if (poolsData?.data && Array.isArray(poolsData.data)) {
          poolsArray = poolsData.data;
        } else if (poolsData?.pools && Array.isArray(poolsData.pools)) {
          poolsArray = poolsData.pools;
        } else {
          console.error("[useWstETHAPR] Unexpected response structure. Full response:", JSON.stringify(poolsData, null, 2).substring(0, 500));
        }
        
        // Find wstETH or stETH pool from Lido
        // Priority: wstETH from Lido > stETH from Lido > any wstETH > any stETH
        let pool = null;
        if (poolsArray.length > 0) {
          // First try: wstETH from Lido
          pool = poolsArray.find((p: any) => {
            const symbol = (p.symbol || "").toLowerCase();
            const project = (p.project || "").toLowerCase();
            return symbol === "wsteth" && project === "lido";
          });
          
          // Second try: stETH from Lido
          if (!pool) {
            pool = poolsArray.find((p: any) => {
              const symbol = (p.symbol || "").toLowerCase();
              const project = (p.project || "").toLowerCase();
              return symbol === "steth" && project === "lido";
            });
          }
          
          // Third try: any wstETH
          if (!pool) {
            pool = poolsArray.find((p: any) => {
              const symbol = (p.symbol || "").toLowerCase();
              return symbol === "wsteth";
            });
          }
          
          // Fourth try: any stETH
          if (!pool) {
            pool = poolsArray.find((p: any) => {
              const symbol = (p.symbol || "").toLowerCase();
              return symbol === "steth";
            });
          }
        }
        
        if (!pool) {
          console.error("[useWstETHAPR] Pool not found. Searching for wstETH/stETH from Lido");
          console.error("[useWstETHAPR] Total pools available:", poolsArray.length);
          if (poolsArray.length > 0) {
            console.error("[useWstETHAPR] Sample pools (first 5):", poolsArray.slice(0, 5).map((p: any) => ({
              pool: p.pool || p.poolId || p.id,
              symbol: p.symbol,
              project: p.project
            })));
          }
          throw new Error("wstETH/stETH pool not found in DeFiLlama");
        }

        console.log("[useWstETHAPR] Found pool:", { 
          pool: pool.pool || pool.poolId || pool.id,
          symbol: pool.symbol,
          project: pool.project,
          apy: pool.apy,
          apyBase: pool.apyBase,
          apyMean30d: pool.apyMean30d
        });

        const data = pool;
        
        // Extract APR from pool data (DeFiLlama LST page shows this as APR)
        // We need to convert APR to APY for accurate labeling
        let apr: number;
        
        if (data?.apy !== undefined && data.apy !== null) {
          // DeFiLlama may label it as "apy" but the LST page shows it as APR
          apr = parseFloat(String(data.apy));
        } else if (data?.apyBase !== undefined && data.apyBase !== null) {
          apr = parseFloat(String(data.apyBase));
        } else if (data?.apyMean30d !== undefined && data.apyMean30d !== null) {
          // Fallback to 30-day mean if available
          apr = parseFloat(String(data.apyMean30d));
        } else {
          console.error("[useWstETHAPR] No APR data found in pool. Available fields:", Object.keys(data));
          console.error("[useWstETHAPR] Pool data:", JSON.stringify(data, null, 2));
          throw new Error("No APR data available for wstETH pool");
        }
        
        console.log("[useWstETHAPR] Parsed APR:", apr);
        
        if (isNaN(apr) || apr < 0 || !isFinite(apr)) {
          console.error("[useWstETHAPR] Invalid APR value:", apr, "from data:", data);
          throw new Error("Invalid APR data from DeFiLlama");
        }

        // DeFiLlama returns APR as a percentage (e.g., 2.56 for 2.56%)
        // Convert to decimal (0.0256)
        const aprDecimal = apr / 100;
        
        // Convert APR to APY using daily compounding formula: APY = (1 + APR/365)^365 - 1
        // This accounts for daily compounding of staking rewards
        const apyDecimal = Math.pow(1 + aprDecimal / 365, 365) - 1;
        
        console.log("[useWstETHAPR] Converted APR to APY:", {
          apr: aprDecimal,
          apy: apyDecimal,
          aprPercent: apr,
          apyPercent: apyDecimal * 100
        });
        
        return apyDecimal;
      } catch (error) {
        console.error("[useWstETHAPR] Error fetching APR:", error);
        throw error;
      }
    },
    enabled,
    refetchInterval: 3600000, // Refresh every hour
    staleTime: 1800000, // 30 minutes
    retry: 2,
  });
}

