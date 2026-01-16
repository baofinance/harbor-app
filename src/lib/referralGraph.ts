import { getGraphHeaders, getGraphUrl, retryGraphQLQuery } from "@/config/graph";

type GraphResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

const HAS_DEPOSITS_QUERY = `
  query HasDeposits($user: Bytes!) {
    deposits(first: 1, where: { user: $user }) { id }
    stabilityPoolDeposits(first: 1, where: { user: $user }) { id }
  }
`;

export async function hasPriorDeposits(address: string): Promise<boolean> {
  const url = getGraphUrl();
  const headers = getGraphHeaders(url);
  const body = JSON.stringify({
    query: HAS_DEPOSITS_QUERY,
    variables: { user: address.toLowerCase() },
  });

  const response = await retryGraphQLQuery(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`GraphQL error (${res.status})`);
    }
    return (await res.json()) as GraphResponse<{
      deposits: Array<{ id: string }>;
      stabilityPoolDeposits: Array<{ id: string }>;
    }>;
  });

  if (response.errors?.length) {
    throw new Error(response.errors[0]?.message || "GraphQL error");
  }

  const deposits = response.data?.deposits?.length ?? 0;
  const pools = response.data?.stabilityPoolDeposits?.length ?? 0;
  return deposits > 0 || pools > 0;
}
