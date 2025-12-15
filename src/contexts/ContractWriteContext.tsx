"use client";

import React, { createContext, useContext } from "react";
import { useContractWrite as useWagmiContractWrite } from "wagmi";
import type { WriteContractResult } from "wagmi/actions";

interface ContractWriteConfig {
 address: `0x${string}`;
 abi: any;
 functionName: string;
}

interface ContractWriteResult {
 writeAsync: (config: { args: any[] }) => Promise<WriteContractResult>;
}

const ContractWriteContext = createContext<{
 useContractWrite: (config: ContractWriteConfig) => ContractWriteResult;
}>({
 useContractWrite: () => ({
 writeAsync: async () => {
 throw new Error(
"useContractWrite must be used within a ContractWriteProvider"
 );
 },
 }),
});

export function ContractWriteProvider({
 children,
}: {
 children: React.ReactNode;
}) {
 const useContractWrite = (config: ContractWriteConfig) => {
 const { writeAsync } = useWagmiContractWrite(config);
 return { writeAsync };
 };

 return (
 <ContractWriteContext.Provider value={{ useContractWrite }}>
 {children}
 </ContractWriteContext.Provider>
 );
}

export function useContractWrite(config: ContractWriteConfig) {
 const context = useContext(ContractWriteContext);
 if (!context) {
 throw new Error(
"useContractWrite must be used within a ContractWriteProvider"
 );
 }
 return context.useContractWrite(config);
}
