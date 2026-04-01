import {
  type Address,
  createPublicClient,
  http,
  isAddress,
  verifyMessage,
} from "viem";
import { mainnet } from "viem/chains";
import { GENESIS_ABI } from "@/abis/shared";

const MESSAGE_TTL_SEC = 600;

export function buildMaidenVoyageYieldAdminMessage(
  genesis: string,
  timestampSec: number
): string {
  return `Harbor maiden voyage yield admin\nGenesis: ${genesis.toLowerCase()}\nTimestamp: ${timestampSec}`;
}

export async function assertMaidenVoyageYieldAdmin(opts: {
  req: Request;
  genesis: Address;
  adminAddress?: Address;
  signature?: `0x${string}`;
  timestampSec?: number;
}): Promise<void> {
  const secret = process.env.MAIDEN_VYIELD_ADMIN_SECRET;
  const auth = opts.req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && auth === secret) {
    return;
  }

  const { genesis, adminAddress, signature, timestampSec } = opts;
  if (!adminAddress || !isAddress(adminAddress)) {
    throw new Error("ADMIN_AUTH: Missing admin wallet");
  }
  if (!signature || !signature.startsWith("0x")) {
    throw new Error("ADMIN_AUTH: Missing signature");
  }
  if (timestampSec == null || !Number.isFinite(timestampSec)) {
    throw new Error("ADMIN_AUTH: Missing timestamp");
  }
  const skew = Math.abs(Math.floor(Date.now() / 1000) - timestampSec);
  if (skew > MESSAGE_TTL_SEC) {
    throw new Error("ADMIN_AUTH: Timestamp expired");
  }

  const message = buildMaidenVoyageYieldAdminMessage(genesis, timestampSec);
  const valid = await verifyMessage({
    address: adminAddress,
    message,
    signature,
  });
  if (!valid) {
    throw new Error("ADMIN_AUTH: Invalid signature");
  }

  const rpc =
    process.env.MAIDEN_VYIELD_RPC_URL ||
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
    "https://eth.llamarpc.com";
  const client = createPublicClient({
    chain: mainnet,
    transport: http(rpc),
  });
  const owner = await client.readContract({
    address: genesis,
    abi: GENESIS_ABI,
    functionName: "owner",
  });
  if (
    typeof owner !== "string" ||
    owner.toLowerCase() !== adminAddress.toLowerCase()
  ) {
    throw new Error("FORBIDDEN: Wallet is not genesis owner");
  }
}
