import { useAccount, useReadContract } from "wagmi";
import { contracts, CONTRACTS, GENESIS_ABI } from "../config/contracts";
import { isAlwaysAdminAddress } from "@/lib/adminAllowlist";

export function useAdminAccess() {
  const { address } = useAccount();

  // Check if connected wallet is the Genesis owner
  const { data: owner } = useReadContract({
    address: contracts.genesis as `0x${string}`,
    abi: GENESIS_ABI,
    functionName: "owner",
  });

  const isAdmin =
    isAlwaysAdminAddress(address) ||
    !!(address && owner && address.toLowerCase() === owner.toLowerCase());

  return { isAdmin, owner };
}
