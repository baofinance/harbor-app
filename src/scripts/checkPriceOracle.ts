import { createPublicClient, http } from "viem";
import { markets } from "../config/contracts";

const client = createPublicClient({
  chain: {
    id: 31337,
    name: "Anvil",
    network: "anvil",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: { http: ["http://127.0.0.1:8545"] },
      public: { http: ["http://127.0.0.1:8545"] },
    },
  },
  transport: http("http://127.0.0.1:8545"),
});

import { CHAINLINK_ORACLE_ABI } from "../abis/shared";

async function checkPriceOracle() {
  const market = markets["steth-usd"];
  const oracleAddress = market.addresses.priceOracle;

  console.log("\nChecking Price Oracle...\n");
  console.log("Oracle Address:", oracleAddress);

  try {
    // First verify the contract is deployed
    const code = await client.getBytecode({
      address: oracleAddress as `0x${string}`,
    });
    if (!code) {
      console.error("❌ Price Oracle is not deployed");
      return;
    }
    console.log("✅ Price Oracle is deployed");

    // Get decimals
    const decimals = await client.readContract({
      address: oracleAddress as `0x${string}`,
      abi: CHAINLINK_ORACLE_ABI,
      functionName: "decimals",
    });

    console.log("\nDecimals:", decimals);

    // Get latest answer
    const price = await client.readContract({
      address: oracleAddress as `0x${string}`,
      abi: CHAINLINK_ORACLE_ABI,
      functionName: "latestAnswer",
    });

    console.log("\nPrice data:");
    console.log("Raw Price:", price.toString());
    console.log("Price in USD:", Number(price) / 10 ** Number(decimals));
  } catch (error) {
    console.error("❌ Error checking price oracle:", error);
  }
}

checkPriceOracle().catch(console.error);
