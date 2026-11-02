export const minterABI = [
  {
    type: "constructor",
    inputs: [
      { name: "collateralToken_", type: "address", internalType: "address" },
      { name: "peggedToken_", type: "address", internalType: "address" },
      { name: "leveragedToken_", type: "address", internalType: "address" },
      {
        name: "peggedBurnSignature",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "HARVESTER_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "LEVERAGED_TOKEN",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "PEGGED_TOKEN",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "UPGRADE_INTERFACE_VERSION",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "WRAPPED_COLLATERAL_TOKEN",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ZERO_FEE_ROLE",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "collateralForLeverageTokens",
    inputs: [
      {
        name: "forLeveragedTokens",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      { name: "wrappedCollateral", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "collateralRatio",
    inputs: [],
    outputs: [
      { name: "collateralRatio_", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "collateralTokenBalance",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "config",
    inputs: [],
    outputs: [
      {
        name: "config_",
        type: "tuple",
        internalType: "struct IMinter.Config",
        components: [
          {
            name: "mintPeggedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
          {
            name: "redeemPeggedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
          {
            name: "mintLeveragedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
          {
            name: "redeemLeveragedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeReceiver",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "freeMintLeveragedToken",
    inputs: [
      {
        name: "wrappedCollateralIn",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "receiver", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "leveragedOut", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "freeMintPeggedToken",
    inputs: [
      {
        name: "wrappedCollateralIn",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "receiver", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "peggedOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "freeRedeemLeveragedToken",
    inputs: [
      { name: "leveragedIn", type: "uint256", internalType: "uint256" },
      { name: "receiver", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "collateralOut", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "freeRedeemPeggedToken",
    inputs: [
      { name: "peggedIn", type: "uint256", internalType: "uint256" },
      { name: "receiver", type: "address", internalType: "address" },
    ],
    outputs: [
      {
        name: "wrappedCollateralOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "freeSwapPeggedForLeveraged",
    inputs: [
      { name: "peggedIn", type: "uint256", internalType: "uint256" },
      { name: "receiver", type: "address", internalType: "address" },
    ],
    outputs: [
      { name: "leveragedOut", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "grantRoles",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "roles", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "harvestable",
    inputs: [],
    outputs: [
      { name: "wrappedAmount", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasAllRoles",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "roles", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasAnyRole",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "roles", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [{ name: "owner_", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "leverageRatio",
    inputs: [],
    outputs: [{ name: "ratio", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "leveragedTokenBalance",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "leveragedTokenPrice",
    inputs: [],
    outputs: [{ name: "nav", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "leveragedTokensForCollateral",
    inputs: [
      {
        name: "forWrappedCollateral",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      { name: "leveragedTokens", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mintLeveragedToken",
    inputs: [
      {
        name: "wrappedCollateralIn",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "receiver", type: "address", internalType: "address" },
      {
        name: "minLeveragedOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      { name: "leveragedOut", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mintLeveragedTokenDryRun",
    inputs: [
      {
        name: "wrappedCollateralIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      { name: "incentiveRatio", type: "int256", internalType: "int256" },
      { name: "wrappedFee", type: "uint256", internalType: "uint256" },
      { name: "wrappedDiscount", type: "uint256", internalType: "uint256" },
      {
        name: "wrappedCollateralUsed",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "leveragedMinted", type: "uint256", internalType: "uint256" },
      { name: "price", type: "uint256", internalType: "uint256" },
      { name: "rate", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mintLeveragedTokenIncentiveRatio",
    inputs: [],
    outputs: [
      { name: "incentiveRatio", type: "int256", internalType: "int256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mintPeggedToken",
    inputs: [
      {
        name: "wrappedCollateralIn",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "receiver", type: "address", internalType: "address" },
      { name: "minPeggedOut", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "peggedOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mintPeggedTokenDryRun",
    inputs: [
      {
        name: "wrappedCollateralIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      { name: "incentiveRatio", type: "int256", internalType: "int256" },
      { name: "wrappedFee", type: "uint256", internalType: "uint256" },
      {
        name: "wrappedCollateralTaken",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "peggedMinted", type: "uint256", internalType: "uint256" },
      { name: "price", type: "uint256", internalType: "uint256" },
      { name: "rate", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mintPeggedTokenIncentiveRatio",
    inputs: [],
    outputs: [
      { name: "incentiveRatio", type: "int256", internalType: "int256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "owner_", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "peggedTokenBalance",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "peggedTokenPrice",
    inputs: [],
    outputs: [{ name: "nav", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "priceOracle",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proxiableUUID",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redeemLeveragedToken",
    inputs: [
      { name: "leveragedIn", type: "uint256", internalType: "uint256" },
      { name: "receiver", type: "address", internalType: "address" },
      {
        name: "minWrappedCollateralOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "wrappedCollateralOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "redeemLeveragedTokenDryRun",
    inputs: [{ name: "leveragedIn", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "incentiveRatio", type: "int256", internalType: "int256" },
      { name: "wrappedFee", type: "uint256", internalType: "uint256" },
      {
        name: "leveragedRedeemed",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "wrappedCollateralReturned",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "price", type: "uint256", internalType: "uint256" },
      { name: "rate", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redeemLeveragedTokenIncentiveRatio",
    inputs: [],
    outputs: [
      { name: "incentiveRatio", type: "int256", internalType: "int256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redeemPeggedForCollateralRatio",
    inputs: [
      {
        name: "targetCollateralRatio",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      { name: "peggedTokens", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redeemPeggedToken",
    inputs: [
      { name: "peggedIn", type: "uint256", internalType: "uint256" },
      { name: "receiver", type: "address", internalType: "address" },
      {
        name: "minWrappedCollateralOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "wrappedCollateralOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "redeemPeggedTokenDryRun",
    inputs: [{ name: "peggedIn", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "incentiveRatio", type: "int256", internalType: "int256" },
      { name: "wrappedFee", type: "uint256", internalType: "uint256" },
      { name: "wrappedDiscount", type: "uint256", internalType: "uint256" },
      { name: "peggedRedeemed", type: "uint256", internalType: "uint256" },
      {
        name: "wrappedCollateralReturned",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "price", type: "uint256", internalType: "uint256" },
      { name: "rate", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redeemPeggedTokenIncentiveRatio",
    inputs: [],
    outputs: [
      { name: "incentiveRatio", type: "int256", internalType: "int256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceRoles",
    inputs: [{ name: "roles", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "reservePool",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "revokeRoles",
    inputs: [
      { name: "user", type: "address", internalType: "address" },
      { name: "roles", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rolesOf",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "roles", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4", internalType: "bytes4" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swapPeggedForLeveragedForCollateralRatio",
    inputs: [
      {
        name: "targetCollateralRatio",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      { name: "peggedTokens", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sweep",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "receiver", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      { name: "confirmOwner", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateConfig",
    inputs: [
      {
        name: "config_",
        type: "tuple",
        internalType: "struct IMinter.Config",
        components: [
          {
            name: "mintPeggedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
          {
            name: "redeemPeggedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
          {
            name: "mintLeveragedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
          {
            name: "redeemLeveragedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateFeeReceiver",
    inputs: [
      { name: "feeReceiver_", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updatePriceOracle",
    inputs: [
      { name: "priceOracle_", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateReservePool",
    inputs: [
      { name: "reservePool_", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "upgradeToAndCall",
    inputs: [
      { name: "newImplementation", type: "address", internalType: "address" },
      { name: "data", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "wrappedCollateralForCollateralRatio",
    inputs: [
      {
        name: "targetCollateralRatio",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      { name: "wrappedCollateral", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MintLeveragedToken",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "receiver",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "collateralIn",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "leveragedOut",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MintPeggedToken",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "receiver",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "collateralIn",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "peggedOut",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RedeemLeveragedToken",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "receiver",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "leveragedTokenBurned",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "collateralOut",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RedeemPeggedToken",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "receiver",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "peggedTokenBurned",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "collateralOut",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RolesUpdated",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      {
        name: "roles",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SwapPeggedForLeveraged",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "receiver",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "peggedTokenBurned",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "leveragedOut",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Swept",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      { name: "to", type: "address", indexed: false, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UpdateConfig",
    inputs: [
      {
        name: "config",
        type: "tuple",
        indexed: false,
        internalType: "struct IMinter.Config",
        components: [
          {
            name: "mintPeggedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
          {
            name: "redeemPeggedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
          {
            name: "mintLeveragedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
          {
            name: "redeemLeveragedIncentiveConfig",
            type: "tuple",
            internalType: "struct IMinter.IncentiveConfig",
            components: [
              {
                name: "collateralRatioBandUpperBounds",
                type: "uint256[]",
                internalType: "uint256[]",
              },
              {
                name: "incentiveRatios",
                type: "int256[]",
                internalType: "int256[]",
              },
            ],
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UpdateFeeReceiver",
    inputs: [
      {
        name: "oldFeeReceiver",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newFeeReceiver",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UpdatePriceOracle",
    inputs: [
      {
        name: "oldPriceOracle",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newPriceOracle",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UpdateReservePool",
    inputs: [
      {
        name: "oldReservePool",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newReservePool",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Upgraded",
    inputs: [
      {
        name: "implementation",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "ActionPaused", inputs: [] },
  {
    type: "error",
    name: "AddressEmptyCode",
    inputs: [{ name: "target", type: "address", internalType: "address" }],
  },
  { type: "error", name: "AlreadyInitialized", inputs: [] },
  { type: "error", name: "CannotCompleteTransfer", inputs: [] },
  {
    type: "error",
    name: "CollateralRatioBoundTooPrecise",
    inputs: [
      { name: "config", type: "string", internalType: "string" },
      { name: "value", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "CollateralRatioBoundValueNotIncreasing",
    inputs: [
      { name: "config", type: "string", internalType: "string" },
      {
        name: "shouldBeLessOrEqual",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "index", type: "uint256", internalType: "uint256" },
      {
        name: "shouldBeGreaterOrEqual",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "CollateralRatioBoundsIncentivesLengthsMismatch",
    inputs: [
      { name: "config", type: "string", internalType: "string" },
      { name: "oneLess", type: "uint256", internalType: "uint256" },
      { name: "oneMore", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "ERC1967InvalidImplementation",
    inputs: [
      { name: "implementation", type: "address", internalType: "address" },
    ],
  },
  { type: "error", name: "ERC1967NonPayable", inputs: [] },
  { type: "error", name: "FailedCall", inputs: [] },
  {
    type: "error",
    name: "IncentiveRatioTooPrecise",
    inputs: [
      { name: "config", type: "string", internalType: "string" },
      { name: "value", type: "int256", internalType: "int256" },
    ],
  },
  {
    type: "error",
    name: "InvalidCollateralRatioBoundValue",
    inputs: [
      { name: "config", type: "string", internalType: "string" },
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "index", type: "uint256", internalType: "uint256" },
      { name: "reason", type: "string", internalType: "string" },
    ],
  },
  {
    type: "error",
    name: "InvalidIncentiveRatioValue",
    inputs: [
      { name: "config", type: "string", internalType: "string" },
      { name: "index", type: "uint256", internalType: "uint256" },
      {
        name: "shouldBeMinusOnetoOne",
        type: "int256",
        internalType: "int256",
      },
      { name: "reason", type: "string", internalType: "string" },
    ],
  },
  { type: "error", name: "InvalidInitialization", inputs: [] },
  { type: "error", name: "InvalidOraclePrice", inputs: [] },
  { type: "error", name: "InvalidRatio", inputs: [] },
  {
    type: "error",
    name: "MintInsufficientAmount",
    inputs: [
      { name: "mintingToken", type: "address", internalType: "address" },
      { name: "miniumum", type: "uint256", internalType: "uint256" },
      { name: "actual", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "MintZeroAmount",
    inputs: [
      { name: "mintingToken", type: "address", internalType: "address" },
    ],
  },
  {
    type: "error",
    name: "NoDepegBoundaryOrDisallow",
    inputs: [{ name: "config", type: "string", internalType: "string" }],
  },
  {
    type: "error",
    name: "NoRedeemableTokens",
    inputs: [
      { name: "redeemingToken", type: "address", internalType: "address" },
    ],
  },
  {
    type: "error",
    name: "NotContractAddress",
    inputs: [{ name: "addr", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "NotERC20Token",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
  { type: "error", name: "NotInitializing", inputs: [] },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  {
    type: "error",
    name: "RequestedBonusNotGiven",
    inputs: [
      { name: "requested", type: "uint256", internalType: "uint256" },
      { name: "available", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "RequestedSubsidyNotGiven",
    inputs: [
      { name: "requested", type: "uint256", internalType: "uint256" },
      { name: "available", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "BelowMinimumCollateralRatio",
    inputs: [
      { name: "collateralRatio", type: "uint256", internalType: "uint256" },
      { name: "minimum", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "UnrecognisedImpairment",
    inputs: [
      { name: "recorded", type: "uint256", internalType: "uint256" },
      { name: "held", type: "uint256", internalType: "uint256" },
    ],
  },
  { type: "error", name: "ZeroPeggedTokenPrice", inputs: [] },
  {
    type: "error",
    name: "ReturnInsufficientAmount",
    inputs: [
      { name: "returningToken", type: "address", internalType: "address" },
      { name: "miniumum", type: "uint256", internalType: "uint256" },
      { name: "actual", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "ReturnZeroAmount",
    inputs: [
      { name: "returningToken", type: "address", internalType: "address" },
    ],
  },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "TooFewIncentiveRatios",
    inputs: [
      { name: "config", type: "string", internalType: "string" },
      { name: "count", type: "uint256", internalType: "uint256" },
      { name: "min", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "TooManyCollateralRatioBounds",
    inputs: [
      { name: "config", type: "string", internalType: "string" },
      { name: "count", type: "uint256", internalType: "uint256" },
      { name: "max", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "TooManyIncentiveRatios",
    inputs: [
      { name: "config", type: "string", internalType: "string" },
      { name: "count", type: "uint256", internalType: "uint256" },
      { name: "max", type: "uint256", internalType: "uint256" },
    ],
  },
  { type: "error", name: "UUPSUnauthorizedCallContext", inputs: [] },
  {
    type: "error",
    name: "UUPSUnsupportedProxiableUUID",
    inputs: [{ name: "slot", type: "bytes32", internalType: "bytes32" }],
  },
  { type: "error", name: "Unauthorized", inputs: [] },
  {
    type: "error",
    name: "UnrecognisedBurnSignature",
    inputs: [{ name: "signature", type: "string", internalType: "string" }],
  },
  {
    type: "error",
    name: "UnsupportedBurnInterface",
    inputs: [{ name: "interfaceId", type: "bytes4", internalType: "bytes4" }],
  },
  { type: "error", name: "ZeroAddress", inputs: [] },
  {
    type: "error",
    name: "ZeroInputBalance",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "ZeroInputBalance",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
  { type: "error", name: "ZeroOraclePrice", inputs: [] },
] as const;
