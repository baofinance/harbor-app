"use client";

import { useQuery } from "@tanstack/react-query";
import { getGraphUrl } from "@/config/graph";
import { POLLING_INTERVALS } from "@/config/polling";

type UserHarborMarks = {
  marksPerDay: string;
};

type GenesisMarksResponse = {
  userHarborMarks: UserHarborMarks[];
};

export function useGenesisMarks(address?: string) {
  const { data, isLoading, refetch } = useQuery<GenesisMarksResponse>({
    queryKey: ["genesisMarksPerDay", address],
    queryFn: async () => {
      if (!address) return { userHarborMarks: [] };

      const graphUrl = getGraphUrl();

      // Get all deposits for the user to discover relevant contracts
      const depositsResponse = await fetch(graphUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query GetUserDeposits($userAddress: Bytes!) {
              deposits(
                where: { user: $userAddress }
                first: 1000
              ) {
                id
                user
                contractAddress
              }
            }
          `,
          variables: { userAddress: address.toLowerCase() },
        }),
      });

      if (!depositsResponse.ok) {
        return { userHarborMarks: [] };
      }

      const depositsResult = await depositsResponse.json();
      if (depositsResult.errors || !depositsResult.data?.deposits) {
        return { userHarborMarks: [] };
      }

      // Unique contract addresses
      const contractAddresses = new Set<string>();
      depositsResult.data.deposits.forEach((deposit: any) => {
        contractAddresses.add(deposit.contractAddress.toLowerCase());
      });

      // Fetch marks for each contract
      const marksPromises = Array.from(contractAddresses).map(
        async (contractAddr) => {
          const id = `${contractAddr}-${address.toLowerCase()}`;
          const marksResponse = await fetch(graphUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
                query GetUserMarks($id: ID!) {
                  userHarborMarks(id: $id) {
                    marksPerDay
                  }
                }
              `,
              variables: { id },
            }),
          });

          if (!marksResponse.ok) return null;
          const marksResult = await marksResponse.json();
          return marksResult.data?.userHarborMarks || null;
        }
      );

      const marks = await Promise.all(marksPromises);
      return {
        userHarborMarks: marks.filter(
          (m): m is { marksPerDay: string } => m !== null
        ),
      };
    },
    enabled: !!address,
    refetchInterval: POLLING_INTERVALS.RARE,
  });

  const marksPerDay =
    data?.userHarborMarks?.reduce(
      (sum, entry) => sum + parseFloat(entry.marksPerDay || "0"),
      0
    ) || 0;

  return {
    data,
    marksPerDay,
    isLoading,
    refetch,
  };
}












