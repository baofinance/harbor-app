import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { markets } from "../config/markets";
import type { PriceDataPoint } from "../config/contracts";
import { CHAINLINK_AGGREGATOR_ABI } from "@/abis/chainlink";

const ROUNDS_TO_FETCH = 100; // Number of historical price points to fetch

export function useOraclePriceHistory(marketId: string) {
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    async function fetchOraclePriceHistory() {
      setIsLoading(true);
      try {
        // Check if oracle address exists and is valid
        const oracleAddress = markets[marketId]?.addresses?.priceOracle;
        if (!oracleAddress || oracleAddress === '0x0000000000000000000000000000000000000000') {
          console.warn(`No valid oracle address for market ${marketId}`);
          setPriceHistory([]);
          setIsLoading(false);
          return;
        }

        // Get latest round data with error handling
        let latestRound;
        try {
          latestRound = await publicClient.readContract({
            address: oracleAddress as `0x${string}`,
            abi: CHAINLINK_AGGREGATOR_ABI,
            functionName: "latestRoundData",
          });
        } catch (oracleError) {
          // Oracle might not be a standard Chainlink oracle or not deployed
          console.warn(`Oracle at ${oracleAddress} does not support latestRoundData():`, oracleError);
          setPriceHistory([]);
          setIsLoading(false);
          return;
        }

        const pricePoints: PriceDataPoint[] = [];
        const latestRoundId = Number(latestRound[0]);

        // Fetch historical rounds
        for (let i = 0; i < ROUNDS_TO_FETCH; i++) {
          const roundId = latestRoundId - i;
          if (roundId <= 0) break;

          try {
            const roundData = await publicClient.readContract({
              address: oracleAddress as `0x${string}`,
              abi: CHAINLINK_AGGREGATOR_ABI,
              functionName: "getRoundData",
              args: [BigInt(roundId)],
            });

            const price = Number(formatUnits(roundData[1], 8)); // Chainlink prices typically have 8 decimals
            const timestamp = Number(roundData[3]);

            // Only add if we have valid data
            if (timestamp > 0 && price > 0) {
              pricePoints.push({
                timestamp,
                price,
                type: "oracle",
                tokenAmount: BigInt(0),
                collateralAmount: BigInt(0),
              });
            }
          } catch (error) {
            console.warn(`Failed to fetch round ${roundId}:`, error);
            continue;
          }
        }

        setPriceHistory(pricePoints.sort((a, b) => a.timestamp - b.timestamp));
      } catch (error) {
        console.error("Error fetching oracle price history:", error);
        setPriceHistory([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (marketId && publicClient) {
      fetchOraclePriceHistory();
    }
  }, [marketId, publicClient]);

  return {
    priceHistory,
    isLoading,
  };
}
