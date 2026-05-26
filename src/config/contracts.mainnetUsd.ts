/**
 * Mainnet USD collateral markets (harbor_v1, May 2026).
 * Shared haUSD pegged token across all four stacks.
 */
import type { MarketConfig } from "./contracts";

const PEGGED_TOKEN =
  "0x2536A8636A99466173229AB15fdb37Fcaa05BA1A" as `0x${string}`;
const FEE_RECEIVER =
  "0xdC903fe5ebCE440f22578D701b95424363D20881" as `0x${string}`;
const OWNER =
  "0x9bABfC1A1952a6ed2caC1922BFfE80c0506364a2" as `0x${string}`;
const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

const STETH = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84" as `0x${string}`;
const WSTETH = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0" as `0x${string}`;
const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" as `0x${string}`;
const PAXG = "0x45804880De22913dAFE09f4980848ECE6EcbAf78" as `0x${string}`;
const TBTC = "0x18084fbA666a33d37592fA2633fD49a74DD93a88" as `0x${string}`;

const ORACLE_STETH_USD =
  "0xcE8633B7198d02860873689Bb2566BD2efD11F52" as `0x${string}`;
const ORACLE_WBTC_USD =
  "0x189d6CA0271F06c222873b4C09A26C83AdCCF73d" as `0x${string}`;
const ORACLE_PAXG_USD =
  "0x647633122f9d9ba87210210d5A3ded365911BF9b" as `0x${string}`;
const ORACLE_TBTC_USD =
  "0x4D72FfE2499C4e66b2c6C11D7AfeA04001dB440C" as `0x${string}`;

const GENESIS_START = "2026-05-17T22:51:35Z";
const GENESIS_END = "2027-01-01T00:00:00Z";

function usdMarketGenesis(
  peggedSymbol: string,
  leveragedSymbol: string
): MarketConfig["genesis"] {
  return {
    startDate: GENESIS_START,
    endDate: GENESIS_END,
    rewards: {
      pegged: { symbol: peggedSymbol, amount: "0" },
      leveraged: { symbol: leveragedSymbol, amount: "0" },
    },
    collateralRatio: 1.0,
    leverageRatio: 2 * 1e18,
  };
}

function buildUsdStackMarket(args: {
  id: string;
  name: string;
  description: string;
  collateralToken: `0x${string}`;
  wrappedCollateralToken: `0x${string}`;
  underlyingCollateralToken: `0x${string}`;
  collateralPrice: `0x${string}`;
  genesis: `0x${string}`;
  leveraged: `0x${string}`;
  minter: `0x${string}`;
  reservePool: `0x${string}`;
  stabilityPoolCollateral: `0x${string}`;
  stabilityPoolLeveraged: `0x${string}`;
  stabilityPoolManager: `0x${string}`;
  peggedRewardSymbol: string;
  leveragedRewardSymbol: string;
}): MarketConfig {
  return {
    id: args.id,
    name: args.name,
    description: args.description,
    startBlock: 0,
    addresses: {
      peggedToken: PEGGED_TOKEN,
      genesis: args.genesis,
      leveragedToken: args.leveraged,
      minter: args.minter,
      reservePool: args.reservePool,
      stabilityPoolCollateral: args.stabilityPoolCollateral,
      stabilityPoolLeveraged: args.stabilityPoolLeveraged,
      stabilityPoolManager: args.stabilityPoolManager,
      priceOracle: args.collateralPrice,
      collateralPrice: args.collateralPrice,
      feeReceiver: FEE_RECEIVER,
      owner: OWNER,
      collateralToken: args.collateralToken,
      wrappedCollateralToken: args.wrappedCollateralToken,
      underlyingCollateralToken: args.underlyingCollateralToken,
      rebalancePoolCollateral: ZERO,
      rebalancePoolLeveraged: ZERO,
    },
    genesis: usdMarketGenesis(args.peggedRewardSymbol, args.leveragedRewardSymbol),
  };
}

export const mainnetUsdMarkets = {
  "steth-usd": buildUsdStackMarket({
    id: "steth-usd",
    name: "stETH - USD",
    description: "wstETH collateral pegged to USD (mainnet)",
    collateralToken: STETH,
    wrappedCollateralToken: WSTETH,
    underlyingCollateralToken: STETH,
    collateralPrice: ORACLE_STETH_USD,
    genesis: "0x40ff767FF4055D53b1BC1B0141221a37B25905fD",
    leveraged: "0xf9B67dE4346458cD9cB18AfA884b25c869A9161B",
    minter: "0xC14837C30BEdF3081cBa2cDeB067fA6F0381e69b",
    reservePool: "0x8EBcE958BAAa46163D32b57b07a36DaA1E36CA8d",
    stabilityPoolCollateral: "0xD21613339E8A6adba7a084f67802731e6045d801",
    stabilityPoolLeveraged: "0x6E7b445e4dac4787445f31382f4E3dCAd510c238",
    stabilityPoolManager: "0x377a4A6BEC4C75F2B7054B67Df03ce9A7497c33d",
    peggedRewardSymbol: "haUSD",
    leveragedRewardSymbol: "hsSTETH-USD",
  }),
  "paxg-usd": buildUsdStackMarket({
    id: "paxg-usd",
    name: "PAXG - USD",
    description: "PAXG collateral pegged to USD (mainnet)",
    collateralToken: PAXG,
    wrappedCollateralToken: PAXG,
    underlyingCollateralToken: PAXG,
    collateralPrice: ORACLE_PAXG_USD,
    genesis: "0x68edA29187587DEf950d566f862FFA85FdA594cf",
    leveraged: "0xba7d5212B74CBB6A8EC3418a1F7C2B360f8aF144",
    minter: "0x7E1D48774F6faD0Aa41cbb47A66BB8Ec3094e3c2",
    reservePool: "0x4C60a87BC13Aa44Fa16b657868FA8a0cDA5DCC52",
    stabilityPoolCollateral: "0xAf7B276dF93F74AE7780E1D5f550bEaf4Ff26415",
    stabilityPoolLeveraged: "0x45B3e0dC9DdaDE6D5e2D45AD08c28B794Bdbf985",
    stabilityPoolManager: "0xf0ab0C95E5cb0C36780D09d4DED29AF869E65f86",
    peggedRewardSymbol: "haUSD",
    leveragedRewardSymbol: "hsPAXG-USD",
  }),
  "wbtc-usd": buildUsdStackMarket({
    id: "wbtc-usd",
    name: "wBTC - USD",
    description: "WBTC collateral pegged to USD (mainnet)",
    collateralToken: WBTC,
    wrappedCollateralToken: WBTC,
    underlyingCollateralToken: WBTC,
    collateralPrice: ORACLE_WBTC_USD,
    genesis: "0xbaE2Cab2Ed87D488CF264bA9411A3fDDAB43ec22",
    leveraged: "0xC5492515fAcfEe2d0C8B475FF3b57B3b79497456",
    minter: "0x0aA2b6Ee6D079f39A52725B33B15854505542B51",
    reservePool: "0x81f15ff2deAd8F3D97e84849072b8550facCd5ee",
    stabilityPoolCollateral: "0xa1959F3dae8C3e7c8825dD7902D30569aF092Ed8",
    stabilityPoolLeveraged: "0xd16C291456060bF36023D9a935719380a14dE3AD",
    stabilityPoolManager: "0x2506223d01072f795487Ff1f67aD40E1D3B15De0",
    peggedRewardSymbol: "haUSD",
    leveragedRewardSymbol: "hsWBTC-USD",
  }),
  "tbtc-usd": buildUsdStackMarket({
    id: "tbtc-usd",
    name: "tBTC - USD",
    description: "tBTC collateral pegged to USD (mainnet)",
    collateralToken: TBTC,
    wrappedCollateralToken: TBTC,
    underlyingCollateralToken: TBTC,
    collateralPrice: ORACLE_TBTC_USD,
    genesis: "0x64E72Cbb24D1f80A0f66778dA0b95A46ead30539",
    leveraged: "0x0348b423C1Fd6d426609b7dCA560398CC3e4eA1B",
    minter: "0x1E326fFF476a5d107f1f6684380f677d2fd5E492",
    reservePool: "0xaF52B331D523dc7eF0A1145638048D218456EBd1",
    stabilityPoolCollateral: "0x9a229b4ec6A0D2154689De8EDa9d14C884DE707b",
    stabilityPoolLeveraged: "0x6a059A79bD261e2bFD160CAc4733108a8BDa2BD6",
    stabilityPoolManager: "0xD9Bc7F5B90BBf7fCCeC24c67905A6205627D8674",
    peggedRewardSymbol: "haUSD",
    leveragedRewardSymbol: "hsTBTC-USD",
  }),
} satisfies Record<string, MarketConfig>;
