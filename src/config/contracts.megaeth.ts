// Contract addresses for MegaETH (chainId 4326)
// From harbor-minter deployments/megaeth/megaeth_test_v1.state.json
// Oracles from harbor-price-aggregators deployments/megaeth/v3-aggregators.json

export type MarketConfig = {
  id: string;
  name: string;
  description: string;
  startBlock: number;
  chainId: 4326;
  addresses: {
    wrappedCollateralToken: `0x${string}`;
    collateralToken: `0x${string}`;
    underlyingCollateralToken: `0x${string}`;
    feeReceiver: `0x${string}`;
    genesis: `0x${string}`;
    leveragedToken: `0x${string}`;
    minter: `0x${string}`;
    owner: `0x${string}`;
    peggedToken: `0x${string}`;
    priceOracle: `0x${string}`;
    stabilityPoolCollateral: `0x${string}`;
    stabilityPoolLeveraged: `0x${string}`;
    reservePool: `0x${string}`;
    rebalancePoolCollateral: `0x${string}`;
    rebalancePoolLeveraged: `0x${string}`;
    collateralPrice: `0x${string}`;
    genesisZap?: `0x${string}`;
    peggedTokenZap?: `0x${string}`;
    leveragedTokenZap?: `0x${string}`;
  };
  genesis: {
    startDate: string;
    endDate: string;
    rewards: {
      pegged: { symbol: string; amount: string };
      leveraged: { symbol: string; amount: string };
    };
    collateralRatio: number;
    leverageRatio: number;
  };
};

export type Markets = {
  [key: string]: MarketConfig;
};

// Shared USD pegged token (USD::pegged) on MegaETH
const PEGGED_TOKEN = "0x0ab2dC552B3fbC8FdD19f36bb7837602cc4414c5" as `0x${string}`;

// Oracle proxies from v3-aggregators.json
const ORACLE_USDMY_BTC = "0xD150d2523120559C4a26C288B749D224427A5D28" as `0x${string}`;
const ORACLE_BTC_USD = "0xB2b9E8eeC94F9Db61C5d6C0022B52838ae58a00d" as `0x${string}`;
const ORACLE_WSTETH_USD = "0x8EDE2Ba210e96f23294063938Bc080aFC8F0BAf1" as `0x${string}`;

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export const markets: Markets = {
  "btc-usdm-megaeth": {
    id: "btc-usdm-megaeth",
    name: "BTC/USDM",
    description: "BTC pegged to USDM collateral (MegaETH)",
    startBlock: 0,
    chainId: 4326,
    addresses: {
      peggedToken: PEGGED_TOKEN,
      genesis: "0x7dC5Ed845cD3A0754Ff0FCb01c7B7bcD305eCeCf" as `0x${string}`,
      leveragedToken: "0xbd8ad08f61442300BbbeB777DA74386cB0F26a3A" as `0x${string}`,
      minter: "0x26C3DF97df2d3f3D8f5F787e3332Bc213f39a96b" as `0x${string}`,
      reservePool: "0xFEA934efCc46758227bF5551b7d48c76B40a5c5D" as `0x${string}`,
      stabilityPoolCollateral: "0x91C4B59658776d704cb5Bd99B13aF83a20C13737" as `0x${string}`,
      stabilityPoolLeveraged: "0x6A4BfAF9e7C7268F954a83B56085ff0277D1b94B" as `0x${string}`,
      stabilityPoolManager: "0x5B4962f3D4462908D289D0B44253F62Ed85a7C3E" as `0x${string}`,
      priceOracle: ORACLE_USDMY_BTC,
      collateralPrice: ORACLE_BTC_USD,
      feeReceiver: ZERO,
      owner: ZERO,
      collateralToken: ZERO,
      wrappedCollateralToken: ZERO,
      underlyingCollateralToken: ZERO,
      rebalancePoolCollateral: ZERO,
      rebalancePoolLeveraged: ZERO,
    },
    genesis: {
      startDate: "2026-03-09T21:46:08Z",
      endDate: "2027-01-01T00:00:00Z",
      rewards: {
        pegged: { symbol: "haUSD", amount: "0" },
        leveraged: { symbol: "hsUSD-BTC", amount: "0" },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
  "wsteth-usd-megaeth": {
    id: "wsteth-usd-megaeth",
    name: "wstETH/USD",
    description: "wstETH collateral (MegaETH)",
    startBlock: 0,
    chainId: 4326,
    addresses: {
      peggedToken: PEGGED_TOKEN,
      genesis: "0x384343cb6F2309D0fF2f7d96087635b9C18bDe43" as `0x${string}`,
      leveragedToken: "0x1f6cd1895f28Ad7837724292dA82C2c5729f37B5" as `0x${string}`,
      minter: "0x0f88bD3Bbe465c618DbB32dB07B77C2745a32c24" as `0x${string}`,
      reservePool: "0xF7239F06345ba805700ED94D5bb240564B131980" as `0x${string}`,
      stabilityPoolCollateral: "0x5EefF77A7937883FDaDbc167B4Bce9791ccDE02b" as `0x${string}`,
      stabilityPoolLeveraged: "0xCb01320C53Bd514a63E9149354ECFf26285A7827" as `0x${string}`,
      stabilityPoolManager: "0x6569d9Cbe1ce9713Ff64Bd3F68f8bD3Ffe17471D" as `0x${string}`,
      priceOracle: ORACLE_WSTETH_USD,
      collateralPrice: ORACLE_WSTETH_USD,
      feeReceiver: ZERO,
      owner: ZERO,
      collateralToken: ZERO,
      wrappedCollateralToken: ZERO,
      underlyingCollateralToken: ZERO,
      rebalancePoolCollateral: ZERO,
      rebalancePoolLeveraged: ZERO,
    },
    genesis: {
      startDate: "2026-03-09T21:46:08Z",
      endDate: "2027-01-01T00:00:00Z",
      rewards: {
        pegged: { symbol: "haUSD", amount: "0" },
        leveraged: { symbol: "hsUSD-wstETH", amount: "0" },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
};
