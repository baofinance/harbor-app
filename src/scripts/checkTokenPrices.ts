import { createPublicClient, http } from "viem";
import { defineChain } from "viem";
import { markets } from "../config/contracts";

// Create a custom chain configuration for Anvil
const anvilChain = defineChain({
  id: 31337,
  name: "Anvil",
  network: "anvil",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
    public: {
      http: ["http://127.0.0.1:8545"],
    },
  },
});

// Create a public client
const publicClient = createPublicClient({
  chain: anvilChain,
  transport: http(),
});

import { minterABI } from "../abis/minter";

async function checkTokenPrices() {
  console.log("Checking Token Prices...\n");

  // Get the minter address from the first market
  const minterAddress = markets[Object.keys(markets)[0]].addresses
    .minter as `0x${string}`;
  console.log("Minter Address:", minterAddress);

  try {
    // Get pegged token price
    const peggedTokenPrice = await publicClient.readContract({
      address: minterAddress,
      abi: minterABI,
      functionName: "peggedTokenPrice",
    });

    // Get leveraged token price
    const leveragedTokenPrice = await publicClient.readContract({
      address: minterAddress,
      abi: minterABI,
      functionName: "leveragedTokenPrice",
    });

    console.log("\nPegged Token Price:", peggedTokenPrice.toString());
    console.log("Pegged Token Price in USD:", Number(peggedTokenPrice) / 1e18);

    console.log("\nLeveraged Token Price:", leveragedTokenPrice.toString());
    console.log(
      "Leveraged Token Price in USD:",
      Number(leveragedTokenPrice) / 1e18
    );
  } catch (error) {
    console.error("Error checking token prices:", error);
  }
}

checkTokenPrices();
