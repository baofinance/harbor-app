// GraphQL configuration for Harbor subgraphs

const GRAPH_API_KEY = process.env.NEXT_PUBLIC_GRAPH_API_KEY || "247d3c7824af808d9ba8a671c7bddfdf";
const useTest2 = process.env.NEXT_PUBLIC_USE_TEST2_CONTRACTS === "true";

export const GRAPH_CONFIG = {
  // Harbor Marks subgraph (for marks tracking). For metals maiden voyage marks to show,
  // set NEXT_PUBLIC_GRAPH_URL to Studio URL e.g. https://api.studio.thegraph.com/query/1718836/harbor-marks/v0.1.1-metals-bonus
  marks: {
    url:
      (useTest2
        ? process.env.NEXT_PUBLIC_GRAPH_URL_TEST2 ||
          process.env.NEXT_PUBLIC_GRAPH_URL
        : process.env.NEXT_PUBLIC_GRAPH_URL) ||
      `https://gateway.thegraph.com/api/subgraphs/id/6XgXZkgr2SL1UWeriY6MsJV9aB2BUfemtMbsfuRq6uP1`,
    chainId: 1,
    network: "mainnet",
  },
  // Sail Token Price subgraph (for price history and PnL)
  sailPrice: {
    // Intentionally do NOT fall back to the marks subgraph; sail price/PnL needs its own schema.
    // If this is empty, UI hooks will throw a clear error prompting configuration.
    url: useTest2
      ? process.env.NEXT_PUBLIC_SAIL_PRICE_GRAPH_URL_TEST2 ||
      process.env.NEXT_PUBLIC_SAIL_PRICE_GRAPH_URL ||
        ""
      : process.env.NEXT_PUBLIC_SAIL_PRICE_GRAPH_URL || "",
    chainId: 1,
    network: "mainnet",
  },
  // Alias for backward compatibility
  production: {
    url:
      process.env.NEXT_PUBLIC_GRAPH_URL ||
      `https://gateway.thegraph.com/api/subgraphs/id/6XgXZkgr2SL1UWeriY6MsJV9aB2BUfemtMbsfuRq6uP1`,
    chainId: 1,
    network: "mainnet",
  },
};

// stETH Market Contracts
export const CONTRACTS = {
  genesis: "0x1454707877cdb966e29cea8a190c2169eeca4b8c",
  minter: "0x8b17b6e8f9ce3477ddaf372a4140ac6005787901",
  peggedToken: "0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc", // haUSD-stETH
  leveragedToken: "0x469ddfcfa98d0661b7efedc82aceeab84133f7fe", // hsUSD-stETH
  collateralToken: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // stETH (mainnet)
  wrappedCollateralToken: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", // wstETH (mainnet)
  stabilityPoolCollateral: "0xac8113ef28c8ef06064e8d78b69890d670273c73",
  stabilityPoolLeveraged: "0x6738c3ee945218fb80700e2f4c1a5f3022a28c8d",
};

// WBTC Market Contracts
export const CONTRACTS_WBTC = {
  genesis: "0x0569ebf818902e448235592f86e63255bbe64fd3",
  minter: "0xa9434313a4b9a4d624c6d67b1d61091b159f5a77",
  peggedToken: "0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc", // haUSD-stETH (shared)
  leveragedToken: "0x03fd55f80277c13bb17739190b1e086b836c9f20", // hsUSD-WBTC
  collateralToken: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
  wrappedCollateralToken: "0x5ee5bf7ae06d1be5997a1a72006fe6c607ec6de8", // Wrapped WBTC
  stabilityPoolCollateral: "0x39613a4c9582dea56f9ee8ad0351011421c3593a",
  stabilityPoolLeveraged: "0xfc2145de73ec53e34c4e6809b56a61321315e806",
};

// Harbor Marks subgraph version with metals maiden voyage support (use this or newer for marks to show)
const HARBOR_MARKS_VERSION = "v0.1.1-metals-bonus";
const STUDIO_MARKS_BASE = "https://api.studio.thegraph.com/query/1718836/harbor-marks";

// Get the Graph URL for marks (always production/mainnet)
export const getGraphUrl = (): string => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return `${STUDIO_MARKS_BASE}/${HARBOR_MARKS_VERSION}`;
  }
  return GRAPH_CONFIG.marks.url;
};

// Get headers for GraphQL requests (includes API key if needed)
// Pass a URL to ensure auth headers match the endpoint you're calling.
export const getGraphHeaders = (url?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // If using Graph Network gateway, add API key in Authorization header
  const graphUrl = url || getGraphUrl();
  const graphApiKey = process.env.NEXT_PUBLIC_GRAPH_API_KEY || GRAPH_API_KEY;
  
  // Check if URL is a Graph Network gateway (requires auth)
  // gateway.thegraph.com uses Bearer token in Authorization header
  // gateway-arbitrum.network.thegraph.com uses API key in URL path
  if (graphUrl.includes("gateway.thegraph.com")) {
    headers["Authorization"] = `Bearer ${graphApiKey}`;
    // Log in production to help debug (only log first few chars of key for security)
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "production") {
      console.log(`[getGraphHeaders] Using GraphQL URL: ${graphUrl}, API key present: ${!!graphApiKey && graphApiKey.length > 0}`);
    }
  } else if (graphUrl.includes("gateway-arbitrum.network.thegraph.com")) {
    // API key is already in the URL path for this gateway
    // But we can also add it as Authorization header for extra security
    headers["Authorization"] = `Bearer ${graphApiKey}`;
  }
  
  return headers;
};

// Get the Sail Price Graph URL (for price history and PnL)
export const getSailPriceGraphUrl = (): string => {
  const url = GRAPH_CONFIG.sailPrice.url;
  if (!url) {
    throw new Error(
      "Missing Sail price subgraph URL. Set NEXT_PUBLIC_SAIL_PRICE_GRAPH_URL (production) or NEXT_PUBLIC_SAIL_PRICE_GRAPH_URL_TEST2 (test2)."
    );
  }
  return url;
};

// Optional Sail Price Graph URL helper (use in UI hooks to avoid hard crashes when not configured).
export const getSailPriceGraphUrlOptional = (): string | null => {
  const url = GRAPH_CONFIG.sailPrice.url;
  return url && url.length > 0 ? url : null;
};

/**
 * Helper function to retry a GraphQL query with exponential backoff
 * Useful for handling transient indexer errors
 */
export async function retryGraphQLQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    retryableErrors?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000, // 1 second
    maxDelay = 10000, // 10 seconds
    retryableErrors = (error: any) => {
      // Retry on indexer errors, network errors, and 5xx errors
      const errorMessage = error?.message || String(error);
      const isIndexerError = 
        errorMessage.includes('bad indexers') ||
        errorMessage.includes('indexer') ||
        errorMessage.includes('indexing') ||
        errorMessage.includes('auth error');
      const isNetworkError = 
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('ECONNREFUSED');
      const isServerError = error?.status >= 500;
      return isIndexerError || isNetworkError || isServerError;
    }
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if we've exhausted retries or error is not retryable
      if (attempt === maxRetries || !retryableErrors(error)) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      if (attempt < maxRetries) {
        const waitTime = Math.min(delay, maxDelay);
        console.log(`[retryGraphQLQuery] Attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`, {
          error: error?.message || String(error),
          attempt: attempt + 1,
          maxRetries
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError;
}
