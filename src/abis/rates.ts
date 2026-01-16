export const fxSaveAbi = [
  {
    inputs: [],
    name: "nav",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const wstEthAbi = [
  {
    inputs: [{ name: "_wstETHAmount", type: "uint256" }],
    name: "getStETHByWstETH",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
