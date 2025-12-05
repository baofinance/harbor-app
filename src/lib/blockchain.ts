// blockchain.ts
import {
    useAccount,
    useContractReads,
    usePublicClient,
} from "wagmi";

export const blockchain = {
    account: useAccount,
    readContract: useContractReads,
    publicClient: usePublicClient,
};