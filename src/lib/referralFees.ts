import { getMainnetRpcClient } from "@/config/rpc";
import { minterABI } from "@/abis/minter";

export type FeeOperation =
  | "MINT_PEGGED"
  | "MINT_LEVERAGED"
  | "REDEEM_PEGGED"
  | "REDEEM_LEVERAGED";

export type FeeDryRunResult = {
  incentiveRatio: bigint;
  wrappedFee: bigint;
  wrappedDiscount?: bigint;
  wrappedCollateralUsed?: bigint;
  wrappedCollateralReturned?: bigint;
  peggedRedeemed?: bigint;
  peggedMinted?: bigint;
  leveragedMinted?: bigint;
  leveragedRedeemed?: bigint;
  price: bigint;
  rate: bigint;
};

export async function calculateFeeFromDryRun(params: {
  minter: `0x${string}`;
  operation: FeeOperation;
  amount: bigint;
  blockNumber?: bigint;
}): Promise<FeeDryRunResult> {
  const client = getMainnetRpcClient();
  const { minter, operation, amount, blockNumber } = params;

  if (operation === "MINT_PEGGED") {
    const result = await client.readContract({
      address: minter,
      abi: minterABI,
      functionName: "mintPeggedTokenDryRun",
      args: [amount],
      blockNumber,
    });
    return {
      incentiveRatio: result[0],
      wrappedFee: result[1],
      wrappedCollateralUsed: result[2],
      peggedMinted: result[3],
      price: result[4],
      rate: result[5],
    };
  }

  if (operation === "MINT_LEVERAGED") {
    const result = await client.readContract({
      address: minter,
      abi: minterABI,
      functionName: "mintLeveragedTokenDryRun",
      args: [amount],
      blockNumber,
    });
    return {
      incentiveRatio: result[0],
      wrappedFee: result[1],
      wrappedDiscount: result[2],
      wrappedCollateralUsed: result[3],
      leveragedMinted: result[4],
      price: result[5],
      rate: result[6],
    };
  }

  if (operation === "REDEEM_PEGGED") {
    const result = await client.readContract({
      address: minter,
      abi: minterABI,
      functionName: "redeemPeggedTokenDryRun",
      args: [amount],
      blockNumber,
    });
    return {
      incentiveRatio: result[0],
      wrappedFee: result[1],
      wrappedDiscount: result[2],
      peggedRedeemed: result[3],
      wrappedCollateralReturned: result[4],
      price: result[5],
      rate: result[6],
    };
  }

  const result = await client.readContract({
    address: minter,
    abi: minterABI,
    functionName: "redeemLeveragedTokenDryRun",
    args: [amount],
    blockNumber,
  });
  return {
    incentiveRatio: result[0],
    wrappedFee: result[1],
    leveragedRedeemed: result[2],
    wrappedCollateralReturned: result[3],
    price: result[4],
    rate: result[5],
  };
}
