import { createPublicClient, http, parseEther, formatEther } from "viem";
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

async function checkMintOutput() {
  console.log("Checking calculateMintPeggedTokenOutput...\n");

  // Get the minter address from the first market (assuming steth-usd)
  const marketId = Object.keys(markets)[0]; // e.g., "steth-usd"
  const minterAddress = markets[marketId]?.addresses.minter as `0x${string}`;

  if (!minterAddress) {
    console.error("Minter address not found in config for market:", marketId);
    return;
  }
  console.log("Minter Address:", minterAddress);

  // Define the input amount (0.0001 wstETH)
  const inputAmountWstETH = "0.0001";
  const inputAmountWei = parseEther(inputAmountWstETH);
  console.log(
    `Input Amount: ${inputAmountWstETH} wstETH (${inputAmountWei.toString()} wei)\n`
  );

  try {
    // Call the contract function
    const peggedAmount = await publicClient.readContract({
      address: minterAddress,
      abi: minterABI,
      functionName: "calculateMintPeggedTokenOutput",
      args: [inputAmountWei],
    });

    console.log("Raw Pegged Amount Output (wei):", peggedAmount.toString());
    console.log(
      "Formatted Pegged Amount Output (haUSD):",
      formatEther(peggedAmount)
    );
  } catch (error) {
    console.error("Error calling calculateMintPeggedTokenOutput:", error);
  }
}

checkMintOutput();
