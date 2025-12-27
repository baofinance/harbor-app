"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { getGraphUrl, getGraphHeaders, retryGraphQLQuery } from "@/config/graph";
import { POLLING_INTERVALS } from "@/config/polling";
import { calculateMarksForAPR } from "@/utils/tideAPR";
import { markets } from "@/config/markets";

/**
 * GraphQL query to get deposits filtered by contract addresses
 * This is used to find unique user-contract pairs
 */
const DEPOSITS_BY_CONTRACTS_QUERY = `
  query GetDepositsByContracts($contractAddresses: [Bytes!]!) {
    deposits(
      where: { 
        contractAddress_in: $contractAddresses
        isActive: true
      }
      first: 1000
    ) {
      id
      user
      contractAddress
    }
  }
`;

/**
 * GraphQL query to get marks by IDs using aliases
 * This allows us to query multiple marks in a single request
 */
const MARKS_BY_IDS_QUERY = `
  query GetMarksByIds($ids: [ID!]!) {
    marks: userHarborMarks(where: { id_in: $ids }) {
      id
      currentMarks
      genesisEnded
      currentDepositUSD
      earlyBonusEligibleDepositUSD
      qualifiesForEarlyBonus
      contractAddress
    }
  }
`;

/**
 * Hook to get total maiden voyage marks across all users
 * Only includes marks from markets where genesis hasn't ended
 * 
 * OPTIMIZED: Uses a single query instead of querying each user individually
 */
export function useTotalMaidenVoyageMarks() {
  const queryClient = useQueryClient();
  
  // Get all genesis contract addresses from markets config (exclude coming soon markets and zero addresses)
  const genesisAddresses = useMemo(() => {
    const genesisMarkets = Object.entries(markets).filter(
      ([_, mkt]) => {
        const genesisAddr = (mkt as any).addresses?.genesis;
        return genesisAddr && 
               genesisAddr !== "0x0000000000000000000000000000000000000000" &&
               (mkt as any).status !== "coming-soon";
      }
    );
    
    return genesisMarkets
      .map(([_, mkt]) => (mkt as any).addresses?.genesis)
      .filter((addr): addr is string => 
        !!addr && 
        typeof addr === "string" && 
        addr !== "0x0000000000000000000000000000000000000000"
      )
      .map(addr => addr.toLowerCase()); // Ensure lowercase for GraphQL query
  }, []);

  const { data, isLoading, error } = useQuery<{
    userHarborMarks: Array<{ 
      id: string;
      currentMarks: string; 
      genesisEnded: boolean;
      currentDepositUSD: string;
      earlyBonusEligibleDepositUSD: string;
      qualifiesForEarlyBonus: boolean;
      contractAddress: string;
      marksForAPR?: number;
    }>;
  }>({
    queryKey: ["totalMaidenVoyageMarks", genesisAddresses],
    queryFn: async () => {
      try {
        const graphUrl = getGraphUrl();
        
        // Debug: Log the query being sent
        console.log('[useTotalMaidenVoyageMarks] Fetching from:', graphUrl);
        console.log('[useTotalMaidenVoyageMarks] Genesis addresses:', genesisAddresses);

        // If no genesis addresses, return empty
        if (genesisAddresses.length === 0) {
          console.log('[useTotalMaidenVoyageMarks] No genesis addresses found');
          return { userHarborMarks: [] };
        }

        // Test query to verify subgraph is responding
        try {
          const testQuery = `
            query TestQuery {
              _meta {
                block {
                  number
                }
              }
            }
          `;
          const testResponse = await fetch(graphUrl, {
            method: "POST",
            headers: getGraphHeaders(),
            body: JSON.stringify({ query: testQuery }),
          });
          const testResult = await testResponse.json();
          console.log('[useTotalMaidenVoyageMarks] Subgraph health check:', {
            ok: testResponse.ok,
            status: testResponse.status,
            hasData: !!testResult.data,
            hasErrors: !!testResult.errors,
            blockNumber: testResult.data?._meta?.block?.number,
          });
        } catch (testError) {
          console.warn('[useTotalMaidenVoyageMarks] Subgraph health check failed:', testError);
        }

        // Step 1: Query deposits to find unique user-contract pairs
        console.log('[useTotalMaidenVoyageMarks] Step 1: Querying deposits for contracts:', genesisAddresses);
        const depositsResult = await retryGraphQLQuery(async () => {
          const depositsResponse = await fetch(graphUrl, {
            method: "POST",
            headers: getGraphHeaders(),
            body: JSON.stringify({
              query: DEPOSITS_BY_CONTRACTS_QUERY,
              variables: { 
                contractAddresses: genesisAddresses 
              },
            }),
          });

          if (!depositsResponse.ok) {
            const errorText = await depositsResponse.text();
            console.error('[useTotalMaidenVoyageMarks] Deposits query HTTP error:', {
              status: depositsResponse.status,
              statusText: depositsResponse.statusText,
              errorText: errorText.substring(0, 500),
            });
            const error = new Error(`HTTP ${depositsResponse.status}: ${errorText || depositsResponse.statusText}`);
            (error as any).status = depositsResponse.status;
            (error as any).responseText = errorText;
            throw error;
          }

          const result = await depositsResponse.json();
          
          if (result.errors) {
            const errorMessages = result.errors.map((err: any) => err.message || String(err)).join('; ');
            console.error('[useTotalMaidenVoyageMarks] Deposits query GraphQL errors:', {
              errors: result.errors,
              errorMessages,
            });
            const error = new Error(`GraphQL errors: ${errorMessages}`);
            (error as any).errors = result.errors;
            (error as any).fullResponse = result;
            throw error;
          }

          console.log('[useTotalMaidenVoyageMarks] Deposits query successful, found', result.data?.deposits?.length || 0, 'deposits');
          return result;
        }, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 5000,
        });

        if (!depositsResult.data?.deposits || depositsResult.data.deposits.length === 0) {
          console.log('[useTotalMaidenVoyageMarks] No deposits found');
          return { userHarborMarks: [] };
        }

        // Step 2: Construct unique user-contract pair IDs
        // ID format: {contractAddress}-{userAddress}
        const uniqueIds = new Set<string>();
        depositsResult.data.deposits.forEach((deposit: any) => {
          const contractAddr = deposit.contractAddress.toLowerCase();
          const userAddr = deposit.user.toLowerCase();
          const id = `${contractAddr}-${userAddr}`;
          uniqueIds.add(id);
        });

        console.log('[useTotalMaidenVoyageMarks] Found', uniqueIds.size, 'unique user-contract pairs');

        if (uniqueIds.size === 0) {
          return { userHarborMarks: [] };
        }

        // Step 3: Query marks for all unique IDs
        // Note: The Graph might not support id_in, so we'll try it first, and if it fails,
        // we'll fall back to individual queries in parallel
        console.log('[useTotalMaidenVoyageMarks] Step 3: Querying marks for', uniqueIds.size, 'IDs');
        
        let marksResult;
        try {
          marksResult = await retryGraphQLQuery(async () => {
            const marksResponse = await fetch(graphUrl, {
              method: "POST",
              headers: getGraphHeaders(),
              body: JSON.stringify({
                query: MARKS_BY_IDS_QUERY,
                variables: { 
                  ids: Array.from(uniqueIds)
                },
              }),
            });

            if (!marksResponse.ok) {
              const errorText = await marksResponse.text();
              const error = new Error(`HTTP ${marksResponse.status}: ${errorText || marksResponse.statusText}`);
              (error as any).status = marksResponse.status;
              (error as any).responseText = errorText;
              throw error;
            }

            const result = await marksResponse.json();
            
            // Log the response for debugging
            console.log('[useTotalMaidenVoyageMarks] Marks query response:', {
              hasData: !!result.data,
              hasMarks: !!result.data?.marks,
              marksCount: result.data?.marks?.length || 0,
              hasErrors: !!result.errors,
              errors: result.errors?.map((e: any) => e.message) || [],
            });
            
            if (result.errors) {
              const errorMessages = result.errors.map((err: any) => err.message || String(err)).join('; ');
              console.error('[useTotalMaidenVoyageMarks] Marks query GraphQL errors:', {
                errors: result.errors,
                errorMessages,
                isIdInError: errorMessages.includes('id_in') || errorMessages.includes('Unknown argument') || errorMessages.includes('No value provided for required argument: `id`'),
              });
              
              // Check if it's an "id_in not supported" type error
              // The Graph doesn't support id_in in where clause, so it returns "No value provided for required argument: `id`"
              if (errorMessages.includes('id_in') || errorMessages.includes('Unknown argument') || errorMessages.includes('No value provided for required argument: `id`')) {
                throw new Error('ID_IN_NOT_SUPPORTED');
              }
              const error = new Error(`GraphQL errors: ${errorMessages}`);
              (error as any).errors = result.errors;
              (error as any).fullResponse = result;
              throw error;
            }

            return result;
          }, {
            maxRetries: 2, // Fewer retries since we'll fall back
            initialDelay: 1000,
            maxDelay: 5000,
          });
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error('[useTotalMaidenVoyageMarks] Marks query error:', {
            error: errorMessage,
            errorType: error?.constructor?.name,
            isIdInError: errorMessage.includes('id_in') || errorMessage.includes('Unknown argument') || errorMessage.includes('No value provided for required argument: `id`'),
            stack: error?.stack?.substring(0, 500),
          });
          
          // If id_in is not supported, fall back to parallel individual queries
          // The Graph doesn't support id_in in where clause, so it returns "No value provided for required argument: `id`"
          if (error.message === 'ID_IN_NOT_SUPPORTED' || errorMessage.includes('id_in') || errorMessage.includes('Unknown argument') || errorMessage.includes('No value provided for required argument: `id`')) {
            console.log('[useTotalMaidenVoyageMarks] id_in not supported, falling back to parallel individual queries');
            const marksPromises = Array.from(uniqueIds).map(async (id) => {
              try {
                const response = await fetch(graphUrl, {
                  method: "POST",
                  headers: getGraphHeaders(),
                  body: JSON.stringify({
                    query: `
                      query GetUserMarks($id: ID!) {
                        userHarborMarks(id: $id) {
                          id
                          currentMarks
                          genesisEnded
                          currentDepositUSD
                          earlyBonusEligibleDepositUSD
                          qualifiesForEarlyBonus
                          contractAddress
                        }
                      }
                    `,
                    variables: { id },
                  }),
                });
                
                if (!response.ok) {
                  console.warn('[useTotalMaidenVoyageMarks] HTTP error for', id, ':', response.status, response.statusText);
                  return null;
                }
                
                const result = await response.json();
                
                if (result.errors) {
                  console.warn('[useTotalMaidenVoyageMarks] GraphQL errors for', id, ':', result.errors);
                  return null;
                }
                
                // userHarborMarks(id: $id) returns a single object, not an array
                const marks = result.data?.userHarborMarks;
                if (!marks) {
                  console.warn('[useTotalMaidenVoyageMarks] No marks data for', id);
                  return null;
                }
                
                return marks;
              } catch (err) {
                console.warn('[useTotalMaidenVoyageMarks] Failed to fetch marks for', id, ':', err);
                return null;
              }
            });
            
            const marksResults = await Promise.allSettled(marksPromises);
            const marks = marksResults
              .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
              .map(r => r.value);
            
            marksResult = { data: { marks } };
            console.log('[useTotalMaidenVoyageMarks] Parallel queries completed, got', marks.length, 'marks out of', uniqueIds.size, 'requested');
          } else {
            // Log the error before re-throwing
            console.error('[useTotalMaidenVoyageMarks] Marks query failed with non-id_in error, re-throwing:', {
              error: errorMessage,
              errorType: error?.constructor?.name,
            });
            throw error; // Re-throw if it's a different error
          }
        }
        
        // Log successful marks query result
        if (marksResult?.data?.marks) {
          console.log('[useTotalMaidenVoyageMarks] Marks query successful, got', marksResult.data.marks.length, 'marks');
        } else {
          console.warn('[useTotalMaidenVoyageMarks] Marks query returned no data:', marksResult);
        }

        // Get previous valid data to preserve it if current query fails completely
        const previousData = queryClient.getQueryData<{
          userHarborMarks: Array<{ 
            currentMarks: string; 
            genesisEnded: boolean;
            currentDepositUSD: string;
            earlyBonusEligibleDepositUSD: string;
            qualifiesForEarlyBonus: boolean;
            marksForAPR?: number;
          }>;
        }>(["totalMaidenVoyageMarks", genesisAddresses]);

        const rawMarks = marksResult.data?.marks || [];
        
        console.log('[useTotalMaidenVoyageMarks] Raw query result:', {
          totalEntries: rawMarks.length,
          sampleEntries: rawMarks.slice(0, 3).map((m: any) => ({
            id: m?.id,
            genesisEnded: m?.genesisEnded,
            currentMarks: m?.currentMarks,
            contractAddress: m?.contractAddress,
          })),
          allGenesisEnded: rawMarks.every((m: any) => m?.genesisEnded === true),
          activeGenesisCount: rawMarks.filter((m: any) => !m?.genesisEnded).length,
        });

        // Filter to only active genesis marks (genesisEnded: false)
        // Then calculate marks including estimated bonuses for APR calculation
        const activeMarks = rawMarks.filter((marks: any) => {
          const isActive = !marks?.genesisEnded;
          if (!isActive && marks) {
            console.log('[useTotalMaidenVoyageMarks] Filtering out ended genesis:', {
              id: marks.id,
              genesisEnded: marks.genesisEnded,
              currentMarks: marks.currentMarks,
            });
          }
          return isActive;
        });
        
        console.log('[useTotalMaidenVoyageMarks] After filtering for active genesis:', {
          totalRaw: rawMarks.length,
          activeCount: activeMarks.length,
          endedCount: rawMarks.length - activeMarks.length,
        });
        
        const validMarks = activeMarks.map((marks: any) => {
          const currentMarks = parseFloat(marks.currentMarks || "0");
          const currentDepositUSD = parseFloat(marks.currentDepositUSD || "0");
          const earlyBonusEligibleDepositUSD = parseFloat(marks.earlyBonusEligibleDepositUSD || "0");
          const genesisEnded = marks.genesisEnded;
          const qualifiesForEarlyBonus = marks.qualifiesForEarlyBonus || false;

          const marksForAPR = calculateMarksForAPR(
            currentMarks,
            currentDepositUSD,
            earlyBonusEligibleDepositUSD,
            genesisEnded,
            qualifiesForEarlyBonus
          );

          return {
            ...marks,
            marksForAPR, // Include calculated marks with bonuses
          };
        });

        // Group by contract address for debugging
        const marksByContract = new Map<string, typeof validMarks>();
        validMarks.forEach((marks) => {
          const contract = marks.contractAddress.toLowerCase();
          if (!marksByContract.has(contract)) {
            marksByContract.set(contract, []);
          }
          marksByContract.get(contract)!.push(marks);
        });
        
        console.log('[useTotalMaidenVoyageMarks] Marks by contract:', 
          Array.from(marksByContract.entries()).map(([contract, entries]) => {
            const totalMarksForContract = entries.reduce((sum, e) => sum + (e.marksForAPR || parseFloat(e.currentMarks || "0")), 0);
            return {
              contract,
              entries: entries.length,
              totalMarks: totalMarksForContract,
            };
          })
        );

        // If we got no valid marks but have previous data, log a warning
        if (validMarks.length === 0 && previousData && previousData.userHarborMarks.length > 0) {
          console.warn('[useTotalMaidenVoyageMarks] Query returned no marks, preserving previous data:', previousData.userHarborMarks.length, 'entries');
        }

        console.log('[useTotalMaidenVoyageMarks] Query result:', {
          totalEntries: validMarks.length,
          sampleEntries: validMarks.slice(0, 3).map(e => ({
            id: e.id,
            currentMarks: e.currentMarks,
            marksForAPR: e.marksForAPR,
            currentDepositUSD: e.currentDepositUSD,
          })),
          totalMarksBase: validMarks.reduce((sum, e) => sum + parseFloat(e.currentMarks || "0"), 0),
          totalMarksWithBonuses: validMarks.reduce((sum, e) => sum + (e.marksForAPR || 0), 0),
        });

        return { userHarborMarks: validMarks };
      } catch (error: any) {
        const errorDetails = {
          error: error?.message || String(error),
          errorType: error?.constructor?.name,
          status: error?.status,
          errors: error?.errors,
          responseText: error?.responseText?.substring(0, 500),
          fullResponse: error?.fullResponse ? JSON.stringify(error.fullResponse).substring(0, 500) : undefined,
          stack: error?.stack?.substring(0, 500),
        };
        console.error('[useTotalMaidenVoyageMarks] Query function error:', errorDetails);
        // Return empty array on error - placeholderData will preserve previous data
        return { userHarborMarks: [] };
      }
    },
    enabled: genesisAddresses.length > 0, // Only run if we have genesis addresses
    refetchInterval: (query) => {
      const data = query.state.data;
      const error = query.state.error;
      
      // Check if we have indexer errors
      const hasIndexerErrors = error && (String(error).includes('bad indexers') || String(error).includes('indexer'));
      
      // Check if we have any valid data
      const hasValidData = data && data.userHarborMarks && data.userHarborMarks.length > 0;
      
      // If indexer errors detected, back off significantly (5 minutes)
      // This prevents hammering the API when indexers are down
      if (hasIndexerErrors) {
        return 300000; // 5 minutes when indexers are having issues
      }
      
      // If we have valid data, only refetch every 2 minutes
      // If no data yet, refetch more frequently to get initial data
      return hasValidData ? 120000 : 30000; // 2 minutes if valid data exists, 30 seconds otherwise
    },
    staleTime: 110000, // Consider data stale after ~2 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while refetching - CRITICAL for data preservation
    retry: (failureCount, error: any) => {
      // Retry on indexer errors up to 2 times
      const errorMessage = error?.message || String(error);
      const isIndexerError = 
        errorMessage.includes('bad indexers') ||
        errorMessage.includes('indexer') ||
        errorMessage.includes('auth error') ||
        errorMessage.includes('missing authorization');
      return isIndexerError && failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });

  // Sum all marks including estimated bonuses (for APR calculation)
  // Use marksForAPR if available (includes bonuses), otherwise fall back to currentMarks
  const totalMarks =
    data?.userHarborMarks?.reduce(
      (sum, entry) => {
        const marks = (entry as any).marksForAPR ?? parseFloat(entry.currentMarks || "0");
        return sum + marks;
      },
      0
    ) || 0;

  // Debug logging - always log
  if (!isLoading) {
    console.log('[useTotalMaidenVoyageMarks] Calculated total:', {
      totalMarks,
      entryCount: data?.userHarborMarks?.length || 0,
      isLoading,
      hasError: !!error,
      error: error ? String(error) : null,
      hasData: !!data,
    });
  }
  
  // Log error if present
  if (error) {
    console.error('[useTotalMaidenVoyageMarks] Error:', error);
  }

  return {
    totalMarks,
    isLoading,
    error,
  };
}

