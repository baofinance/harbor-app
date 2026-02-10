/**
 * EIP-2612 Permit read ABIs (DOMAIN_SEPARATOR, nonces, name, version)
 * Used for checking permit support and building permit domain
 */
export const ERC20_PERMIT_READS_ABI = [
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [{ type: "bytes32", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ type: "address", name: "owner" }],
    name: "nonces",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ type: "string", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ type: "string", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * EIP-2612 Permit ABI
 * Used for gasless token approvals
 */
export const ERC20_PERMIT_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
