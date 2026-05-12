// Contract addresses for MegaETH (chainId 4326)
// Production deployment (harbor_megaeth_v1)
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
const PEGGED_TOKEN = "0xbEd2c24Cf10d7aC58350364aF8d3AbC0ce0D626f" as `0x${string}`;

// Oracle proxies from v3-aggregators.json
const ORACLE_USDMY_BTC = "0xD150d2523120559C4a26C288B749D224427A5D28" as `0x${string}`;
const ORACLE_BTC_USD = "0xB2b9E8eeC94F9Db61C5d6C0022B52838ae58a00d" as `0x${string}`;
const ORACLE_WSTETH_USD = "0x8EDE2Ba210e96f23294063938Bc080aFC8F0BAf1" as `0x${string}`;

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// Collateral token addresses on MegaETH (chainId 4326)
const WSTETH_MEGAETH = "0x601aC63637933D88285A025C685AC4e9a92a98dA" as `0x${string}`;
const BTC_B_MEGAETH = "0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072" as `0x${string}`; // btc.b = BTC bridged

export const markets: Markets = {
  "btc-usd-megaeth": {
    id: "btc-usd-megaeth",
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
      collateralToken: BTC_B_MEGAETH,
      wrappedCollateralToken: BTC_B_MEGAETH,
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
      genesis: "0x004C7091051bBD43dd1C26e3E37C85F869a987e7" as `0x${string}`,
      leveragedToken: "0x6c8Bf305a6F8C4613265DB876c8A1c3fCdd0d1F1" as `0x${string}`,
      minter: "0x77aD4a052812f1EeD89Fb4ED309e81c815D8d755" as `0x${string}`,
      reservePool: "0x0d60a96678066f3f9dCD1227481E7c1B5e2cbD96" as `0x${string}`,
      stabilityPoolCollateral: "0xe4C4C226A2a267172C09efD43f9Db92B875FdA72" as `0x${string}`,
      stabilityPoolLeveraged: "0x981D002e7A14E9f37f5feC17caa0B69f7A722132" as `0x${string}`,
      stabilityPoolManager: "0xfc45f502B0C04fF8dE7cca1703440D87De4B5dE7" as `0x${string}`,
      priceOracle: ORACLE_WSTETH_USD,
      collateralPrice: ORACLE_WSTETH_USD,
      feeReceiver: ZERO,
      owner: ZERO,
      collateralToken: WSTETH_MEGAETH,
      wrappedCollateralToken: WSTETH_MEGAETH,
      underlyingCollateralToken: ZERO,
      rebalancePoolCollateral: ZERO,
      rebalancePoolLeveraged: ZERO,
    },
    genesis: {
      startDate: "2026-03-09T21:46:08Z",
      endDate: "2027-01-01T00:00:00Z",
      rewards: {
        pegged: { symbol: "haUSD", amount: "0" },
        leveraged: { symbol: "hsSTETH-USD", amount: "0" },
      },
      collateralRatio: 1.0,
      leverageRatio: 2 * 1e18,
    },
  },
};
