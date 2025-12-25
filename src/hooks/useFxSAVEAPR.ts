import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch fxSAVE APR from DeFiLlama Yields API
 * Pool ID: ee0b7069-f8f3-4aa2-a415-728f13e6cc3d
 * API: https://yields.llama.fi/pool/{poolId}
 */
export function useFxSAVEAPR(enabled = true) {
  const FXSAVE_POOL_ID = "ee0b7069-f8f3-4aa2-a415-728f13e6cc3d";

  return useQuery({
    queryKey: ["fxsave-apr", FXSAVE_POOL_ID],
    queryFn: async () => {
      try {
        // Try the pools endpoint first to get all pools, then filter
        const poolsResponse = await fetch("https://yields.llama.fi/pools");
        
        if (!poolsResponse.ok) {
          console.error("[useFxSAVEAPR] HTTP error:", poolsResponse.status, poolsResponse.statusText);
          throw new Error(`Failed to fetch pools: ${poolsResponse.statusText}`);
        }

        const poolsData = await poolsResponse.json();
        console.log("[useFxSAVEAPR] Pools data type:", typeof poolsData, Array.isArray(poolsData) ? `array length: ${poolsData.length}` : "not array");
        console.log("[useFxSAVEAPR] Pools data keys:", poolsData ? Object.keys(poolsData) : "null/undefined");
        
        // DeFiLlama API might return { data: [...] } or just an array
        let poolsArray: any[] = [];
        if (Array.isArray(poolsData)) {
          poolsArray = poolsData;
        } else if (poolsData?.data && Array.isArray(poolsData.data)) {
          poolsArray = poolsData.data;
        } else if (poolsData?.pools && Array.isArray(poolsData.pools)) {
          poolsArray = poolsData.pools;
        } else {
          console.error("[useFxSAVEAPR] Unexpected response structure. Full response:", JSON.stringify(poolsData, null, 2).substring(0, 500));
        }
        
        // Find the pool by ID - check multiple possible ID fields and also search by symbol/name
        let pool = null;
        if (poolsArray.length > 0) {
          // First try exact ID match
          pool = poolsArray.find((p: any) => 
            p.pool === FXSAVE_POOL_ID || 
            p.poolId === FXSAVE_POOL_ID ||
            p.id === FXSAVE_POOL_ID
          );
          
          // If not found, search by symbol or name containing "fxsave"
          if (!pool) {
            pool = poolsArray.find((p: any) => {
              const symbol = (p.symbol || "").toLowerCase();
              const name = (p.name || "").toLowerCase();
              const project = (p.project || "").toLowerCase();
              return symbol.includes("fxsave") || 
                     name.includes("fxsave") || 
                     (project.includes("fx") && (symbol.includes("save") || name.includes("save")));
            });
          }
          
          // Log first few pools for debugging
          if (!pool && poolsArray.length > 0) {
            console.log("[useFxSAVEAPR] Sample pools (first 5):", poolsArray.slice(0, 5).map((p: any) => ({
              pool: p.pool || p.poolId || p.id,
              symbol: p.symbol,
              name: p.name,
              project: p.project
            })));
          }
        }
        
        if (!pool) {
          console.error("[useFxSAVEAPR] Pool not found. Pool ID:", FXSAVE_POOL_ID);
          console.error("[useFxSAVEAPR] Total pools available:", poolsArray.length);
          console.error("[useFxSAVEAPR] Sample pools (first 3):", poolsArray.slice(0, 3).map((p: any) => ({
            pool: p.pool || p.poolId || p.id,
            symbol: p.symbol,
            name: p.name
          })));
          throw new Error("Pool not found in DeFiLlama");
        }

        console.log("[useFxSAVEAPR] Found pool:", { 
          pool: pool.pool || pool.poolId || pool.id,
          symbol: pool.symbol,
          apy: pool.apy,
          apyBase: pool.apyBase,
          apyReward: pool.apyReward,
          apyMean30d: pool.apyMean30d,
          apyPct1D: pool.apyPct1D,
          apyPct7D: pool.apyPct7D,
          apyPct30D: pool.apyPct30D
        });

        const data = pool;
        
        // DeFiLlama API response structure can vary
        // DeFiLlama pools response is an array of pool objects
        // Each pool has: apy, apyBase, apyReward, etc.
        // Use total APY (apy) which matches what's shown on the pool detail page
        let apy: number;
        
        // Prioritize total APY (apy) which includes all rewards
        if (data?.apy !== undefined && data.apy !== null) {
          apy = parseFloat(String(data.apy));
          console.log("[useFxSAVEAPR] Using apy (total):", apy);
        } else if (data?.apyBase !== undefined && data.apyBase !== null) {
          // Fall back to base APY if total is not available
          apy = parseFloat(String(data.apyBase));
          console.log("[useFxSAVEAPR] Using apyBase:", apy);
        } else if (data?.apyMean30d !== undefined && data.apyMean30d !== null) {
          // Fallback to 30-day mean if available
          apy = parseFloat(String(data.apyMean30d));
          console.log("[useFxSAVEAPR] Using apyMean30d:", apy);
        } else {
          console.error("[useFxSAVEAPR] No APY data found in pool. Available fields:", Object.keys(data));
          console.error("[useFxSAVEAPR] All APY-related fields:", {
            apy: data?.apy,
            apyBase: data?.apyBase,
            apyReward: data?.apyReward,
            apyMean30d: data?.apyMean30d,
            apyPct1D: data?.apyPct1D,
            apyPct7D: data?.apyPct7D,
            apyPct30D: data?.apyPct30D
          });
          throw new Error("No APY data available for this pool");
        }
        
        console.log("[useFxSAVEAPR] Final parsed APY:", apy);
        
        if (isNaN(apy) || apy < 0 || !isFinite(apy)) {
          console.error("[useFxSAVEAPR] Invalid APY value:", apy, "from data:", data);
          throw new Error("Invalid APY data from DeFiLlama");
        }

        // DeFiLlama returns APY as a percentage (e.g., 8.58 for 8.58%)
        // Convert to decimal (0.0858)
        return apy / 100;
      } catch (error) {
        console.error("[useFxSAVEAPR] Error fetching APR:", error);
        throw error;
      }
    },
    enabled,
    refetchInterval: 3600000, // Refresh every hour
    staleTime: 1800000, // 30 minutes
    retry: 2,
  });
}

