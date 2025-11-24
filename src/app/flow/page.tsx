"use client";

import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import { useAccount, useContractReads, usePublicClient } from "wagmi";
import {
  MapIcon,
  ChartBarIcon,
  CpuChipIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import TokenIcon from "@/components/TokenIcon";

// Helper function to get logo path for tokens/networks
function getLogoPath(symbol: string): string {
  const normalizedSymbol = symbol.toLowerCase();
  if (normalizedSymbol === "eth" || normalizedSymbol === "ethereum") {
    return "/icons/eth.png";
  }
  if (normalizedSymbol === "fxsave") {
    return "/icons/fxSave.png";
  }
  if (normalizedSymbol === "fxusd") {
    return "/icons/fxUSD.webp";
  }
  if (normalizedSymbol === "usdc") {
    return "/icons/usdc.webp";
  }
  if (normalizedSymbol === "steth") {
    return "/icons/steth_logo.webp";
  }
  if (normalizedSymbol === "wsteth") {
    return "/icons/wstETH.webp";
  }
  if (normalizedSymbol === "btc" || normalizedSymbol === "bitcoin") {
    return "/icons/btc.png";
  }
  if (normalizedSymbol === "susde" || normalizedSymbol === "usde") {
    return "/icons/susde.svg"; // sUSDE icon
  }
  if (normalizedSymbol === "usd" || normalizedSymbol === "dollar") {
    return "/icons/usd.svg"; // USD icon
  }
  if (normalizedSymbol === "eur" || normalizedSymbol === "euro") {
    return "/icons/eur.svg"; // EUR icon
  }
  if (normalizedSymbol === "xau" || normalizedSymbol === "gold") {
    return "/icons/gold.svg"; // Gold/XAU icon
  }
  if (normalizedSymbol === "mcap") {
    return "/icons/mcap.svg"; // Use mcap logo for MCAP
  }
  if (normalizedSymbol === "t6ch" || normalizedSymbol === "t6") {
    return "/icons/mcap.svg"; // Use mcap logo for T6CH
  }
  // Stock tickers: AAPL, AMZN, GOOGL, META, MSFT, NVDA, SPY, TSLA - use stock icon
  const stockTickers = ["aapl", "amzn", "googl", "meta", "msft", "nvda", "spy", "tsla"];
  if (stockTickers.includes(normalizedSymbol)) {
    return "/icons/stock.svg"; // Stock icon
  }
  // For other tokens without specific icons, use placeholder
  return "/icons/placeholder.svg";
}

// Mainnet fxSAVE feeds
const fxSAVEMainnetFeeds = [
  {
    label: "fxSAVE/ETH",
    address: "0xd4aa396CBEC88F1b2D76137eEBF4ef80e309169D" as const,
  },
  {
    label: "fxSAVE/BTC",
    address: "0x129b639a28aBAe0693C13FaCE56873d25f6Cb0AD" as const,
  },
  {
    label: "fxSAVE/EUR",
    address: "0x5256c0d14cFEcEDBaF7D8D44e6D88Bea5344c5a9" as const,
  },
  {
    label: "fxSAVE/XAU",
    address: "0x2bc0484B5b0FAfFf0a14B858D85E8830621fE0CA" as const,
  },
  {
    label: "fxSAVE/MCAP",
    address: "0x4c07ce6454D5340591f62fD7d3978B6f42Ef953e" as const,
  },
];

// Mainnet wstETH feeds
const wstETHMainnetFeeds = [
  {
    label: "wstETH/ETH",
    address: "0x1687d4BDE380019748605231C956335a473Fd3dc" as const,
  },
  {
    label: "wstETH/BTC",
    address: "0x9f3F78951bBf68fc3cBA976f1370a87B0Fc13cd4" as const,
  },
  {
    label: "wstETH/EUR",
    address: "0xdb9Bc1Cdc816B727d924C9ebEba73F04F26a318a" as const,
  },
  {
    label: "wstETH/XAU",
    address: "0xF1a7a5060f22edA40b1A94a858995fa2bcf5E75A" as const,
  },
  {
    label: "wstETH/MCAP",
    address: "0x18903fF6E49c98615Ab741aE33b5CD202Ccc0158" as const,
  },
];

// Legacy proxyFeeds for backward compatibility (fxSAVE/ETH is first)
const proxyFeeds = [fxSAVEMainnetFeeds[0], ...fxSAVEMainnetFeeds.slice(1), ...wstETHMainnetFeeds];

// Arbitrum sUSDE feeds
const arbitrumFeeds = [
  {
    label: "sUSDE/USD",
    address: "0xFA94648016f96a900Fa3038144d644Df9B445588" as const,
  },
  {
    label: "sUSDE/AAPL",
    address: "0x755752E1a403A7eb89e775353e4f0520de5726fB" as const,
  },
  {
    label: "sUSDE/AMZN",
    address: "0xAdf53c523d140fa25b7bbaD9d6e2314964BF72f0" as const,
  },
  {
    label: "sUSDE/GOOGL",
    address: "0x17803CB7B18781EE6752C1b42A63f265f8fd38f0" as const,
  },
  {
    label: "sUSDE/META",
    address: "0x03d69eB9bA1cE92d16E4E0cEf94F3DE34225C89f" as const,
  },
  {
    label: "sUSDE/MSFT",
    address: "0x4749D226754f0f022724D7f9458DEC776659FFd2" as const,
  },
  {
    label: "sUSDE/NVDA",
    address: "0x7B204dCcF87ea084302F262366f42849f33E133C" as const,
  },
  {
    label: "sUSDE/SPY",
    address: "0xA482A371768fd9880d9fC07F0999C1d6d6DE6b05" as const,
  },
  {
    label: "sUSDE/TSLA",
    address: "0x15Eb42775751b3d39296558Cc3BE97507FC2B9a4" as const,
  },
];

// Arbitrum wstETH feeds
const arbitrumWstETHFeeds = [
  {
    label: "wstETH/USD",
    address: "0xf087d6f5b5cE424c61C03Da57ABCD2B03C34DA96" as const,
  },
  {
    label: "wstETH/AAPL",
    address: "0x14e7810c0a800962705ab8156187Ce2B79319e4e" as const,
  },
  {
    label: "wstETH/AMZN",
    address: "0xB4172617FF8a780d190bC542C6db77d6D2ACb542" as const,
  },
  {
    label: "wstETH/GOOGL",
    address: "0x1f5b3fE04e97C57642030f2757A376b1cF052850" as const,
  },
  {
    label: "wstETH/META",
    address: "0x63B8B8fE0F19D4Ed52E1d9319097321b5aaE0b05" as const,
  },
  {
    label: "wstETH/MSFT",
    address: "0x1736B25b35051f124f70EEAb5FCac989e410f6Bc" as const,
  },
  {
    label: "wstETH/NVDA",
    address: "0x0912645321683005b1a3D85fa4eb52268ceBB36e" as const,
  },
  {
    label: "wstETH/SPY",
    address: "0x9720a8101A706307866bd9849F9F14E823dE1F6e" as const,
  },
  {
    label: "wstETH/TSLA",
    address: "0x52986F8cb7F9900d7B39dbD8EB4238d67C62d42e" as const,
  },
  {
    label: "wstETH/T6CH",
    address: "0x5595d232581C021Dc748629f3f6A4EDF0EEee5eF" as const,
  },
];

// Minimal ABI for proxy feeds - all feeds use consistent bytes32 for feedIdentifiers
const proxyAbi = [
  {
    inputs: [],
    name: "getPrice",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [
      { name: "minPrice", type: "uint256" },
      { name: "maxPrice", type: "uint256" },
      { name: "minRate", type: "uint256" },
      { name: "maxRate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // getConstraints returns (uint64,uint256)
  {
    inputs: [{ name: "id", type: "uint8" }],
    name: "getConstraints",
    outputs: [{ type: "uint64" }, { type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint8" }],
    name: "feedIdentifiers",
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Minimal Chainlink aggregator ABI for description/decimals/latestRoundData/latestAnswer
const aggregatorAbi = [
  {
    inputs: [],
    name: "description",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function format18(value?: bigint, maxFrac = 6) {
  if (value === undefined) return "-";
  const n = Number(value) / 1e18;
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function formatBytes32(b?: `0x${string}`) {
  return b || "-";
}

function formatFeedIdentifier(b?: `0x${string}`) {
  if (!b) return "-";
  return b.replace(/^0x000000000000000000000000/i, "0x");
}

function formatHeartbeat(value?: bigint) {
  if (value === undefined) return "-";
  const seconds = Number(value);
  if (seconds <= 60) return `${seconds}s`;
  if (seconds <= 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds <= 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

function formatPercent18(value?: bigint, maxFrac = 2) {
  if (value === undefined) return "-";
  const pct = (Number(value) / 1e18) * 100;
  return `${pct.toFixed(maxFrac)}%`;
}

function formatUnit(value?: bigint, decimals?: number, maxFrac = 6) {
  if (value === undefined || decimals === undefined) return "-";
  const n = Number(value) / 10 ** decimals;
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function parsePair(label: string): { base: string; quote: string } {
  const idx = label.indexOf("/");
  if (idx === -1) return { base: label, quote: "" };
  return { base: label.slice(0, idx), quote: label.slice(idx + 1) };
}

function formatPairDisplay(label: string, price: string | undefined): string {
  if (!price || price === "-") return "-";
  const { base, quote } = parsePair(label);
  return `1 ${base} = ${price} ${quote}`;
}

function pairEstimateLabel(
  label: string,
  raw?: bigint,
  priceStr?: string
): string | undefined {
  let p: number | undefined;
  if (raw !== undefined) {
    p = Number(raw) / 1e18;
  } else if (priceStr) {
    const parsed = parseFloat((priceStr || "").toString().replace(/,/g, ""));
    if (!Number.isNaN(parsed)) p = parsed;
  }
  if (!p || p <= 0) return undefined;
  const inv = 1 / p;
  const { base, quote } = parsePair(label);
  return `${inv.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} ${base} for 1 ${quote}`;
}

function etherscanAddressUrl(
  address?: `0x${string}` | string
): string | undefined {
  if (!address) return undefined;
  return `https://etherscan.io/address/${address}`;
}

function ExternalLinkIcon({
  className = "inline-block w-4 h-4 align-[-2px] ml-1",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3z" />
      <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z" />
    </svg>
  );
}

function ChevronIcon({
  className = "w-3 h-3 text-[#1E4775]",
  expanded = false,
}: {
  className?: string;
  expanded?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform ${expanded ? "rotate-90" : ""}`}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function decodeBytes32ToAscii(bytes?: `0x${string}`): string {
  if (!bytes) return "";
  try {
    const hex = bytes.slice(2);
    const raw = Array.from({ length: hex.length / 2 }, (_, i) =>
      String.fromCharCode(parseInt(hex.substr(i * 2, 2), 16))
    ).join("");
    const trimmed = raw.replace(/\u0000+$/g, "");
    // keep only printable ASCII
    const printable = trimmed.replace(/[^\x20-\x7E]/g, "");
    return printable.trim();
  } catch {
    return "";
  }
}

function deriveFeedName(bytes?: `0x${string}`): string {
  const ascii = decodeBytes32ToAscii(bytes);
  if (ascii.includes(".eth")) return ascii;
  if (/^[-a-zA-Z0-9 .:_/()]+$/.test(ascii) && ascii.length >= 3) return ascii;
  return "-";
}

function bytes32ToAddress(bytes?: `0x${string}`): `0x${string}` | undefined {
  if (!bytes || bytes.length !== 66) return undefined;
  const tail = bytes.slice(-40);
  return `0x${tail}` as `0x${string}`;
}

export default function FlowPage() {
  const [expanded, setExpanded] = useState<
    null | { kind: "eth" } | { kind: "fxSAVEMainnet"; idx: number } | { kind: "wstETHMainnet"; idx: number } | { kind: "arbitrum"; idx: number } | { kind: "arbitrumWstETH"; idx: number }
  >(null);
  const [fxSAVEMainnetExpanded, setFxSAVEMainnetExpanded] = useState(false);
  const [wstETHMainnetExpanded, setWstETHMainnetExpanded] = useState(false);
  const [arbitrumSUSDEExpanded, setArbitrumSUSDEExpanded] = useState(false);
  const [arbitrumWstETHExpanded, setArbitrumWstETHExpanded] = useState(false);
  // All feeds now use only 2 sources: firstFeed (ID 1) and secondFeed (ID 2)
  const ids = useMemo(() => [1, 2] as const, []);
  const ZERO_BYTES32 =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

  const { data } = useContractReads({
    contracts: [
      {
        address: proxyFeeds[0].address,
        abi: proxyAbi,
        functionName: "getPrice",
      },
      {
        address: proxyFeeds[0].address,
        abi: proxyAbi,
        functionName: "latestAnswer",
      },
      ...ids.flatMap((id) => [
        {
          address: proxyFeeds[0].address,
          abi: proxyAbi,
          functionName: "getConstraints",
          args: [id] as const,
        },
        {
          address: proxyFeeds[0].address,
          abi: proxyAbi,
          functionName: "feedIdentifiers",
          args: [id] as const,
        },
      ]),
    ],
  });

  const price = data?.[0]?.result as bigint | undefined;
  const tuple = data?.[1]?.result as
    | [bigint, bigint, bigint, bigint]
    | undefined;

  // Derive aggregator addresses from feedIdentifiers (bytes32 left-padded addresses)
  const aggregatorAddresses = useMemo(() => {
    const out: (`0x${string}` | undefined)[] = ids.map((id, i) => {
      const f = data?.[3 + i * 2]?.result as `0x${string}` | undefined;
      return bytes32ToAddress(f);
    });
    return out.filter((a): a is `0x${string}` => Boolean(a));
  }, [data, ids]);

  // Fetch descriptions for derived aggregator addresses (optional)
  const { data: descReads } = useContractReads({
    contracts: aggregatorAddresses.map((addr) => ({
      address: addr,
      abi: aggregatorAbi,
      functionName: "description" as const,
    })),
    query: { enabled: aggregatorAddresses.length > 0 },
  });

  // Fetch decimals and latestAnswer for aggregator addresses to compute per-row prices
  const { data: aggDecReads } = useContractReads({
    contracts: aggregatorAddresses.map((addr) => ({
      address: addr,
      abi: aggregatorAbi,
      functionName: "decimals" as const,
    })),
    query: { enabled: aggregatorAddresses.length > 0 },
  });
  const { data: aggAnsReads } = useContractReads({
    contracts: aggregatorAddresses.map((addr) => ({
      address: addr,
      abi: aggregatorAbi,
      functionName: "latestAnswer" as const,
    })),
    query: { enabled: aggregatorAddresses.length > 0 },
  });

  const addressToDescription = useMemo(() => {
    const map = new Map<string, string>();
    aggregatorAddresses.forEach((addr, idx) => {
      const d = descReads?.[idx]?.result as string | undefined;
      if (addr && typeof d === "string" && d.trim().length > 0) {
        map.set(addr.toLowerCase(), d.trim());
      }
    });
    return map;
  }, [aggregatorAddresses, descReads]);

  // Fetch price for fxSAVE mainnet feeds (excluding ETH which is handled separately)
  const { data: fxSAVEMainnetReads } = useContractReads({
    contracts: fxSAVEMainnetFeeds.slice(1).map((f) => ({
      address: f.address,
      abi: proxyAbi,
      functionName: "getPrice" as const,
    })),
    query: { enabled: fxSAVEMainnetFeeds.length > 1 },
  });

  // Read latestAnswer() tuples for fxSAVE mainnet feeds
  const { data: fxSAVEMainnetLatest } = useContractReads({
    contracts: fxSAVEMainnetFeeds.slice(1).map((f) => ({
      address: f.address,
      abi: proxyAbi,
      functionName: "latestAnswer" as const,
    })),
    query: { enabled: fxSAVEMainnetFeeds.length > 1 },
  });

  const fxSAVEMainnetFeedPrices = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < fxSAVEMainnetFeeds.length - 1; i += 1) {
      const p = fxSAVEMainnetReads?.[i]?.result as bigint | undefined;
      out.push(format18(p));
    }
    return out;
  }, [fxSAVEMainnetReads]);

  // Fetch price for wstETH mainnet feeds
  const { data: wstETHMainnetReads } = useContractReads({
    contracts: wstETHMainnetFeeds.map((f) => ({
      address: f.address,
      abi: proxyAbi,
      functionName: "getPrice" as const,
    })),
    query: { enabled: wstETHMainnetFeeds.length > 0 },
  });

  // Read latestAnswer() tuples for wstETH mainnet feeds
  const { data: wstETHMainnetLatest } = useContractReads({
    contracts: wstETHMainnetFeeds.map((f) => ({
      address: f.address,
      abi: proxyAbi,
      functionName: "latestAnswer" as const,
    })),
    query: { enabled: wstETHMainnetFeeds.length > 0 },
  });

  const wstETHMainnetFeedPrices = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < wstETHMainnetFeeds.length; i += 1) {
      const p = wstETHMainnetReads?.[i]?.result as bigint | undefined;
      out.push(format18(p));
    }
    return out;
  }, [wstETHMainnetReads]);

  // Fallback fetch via public client to ensure feeds resolve on forks
  const publicClient = usePublicClient();
  const [fxSAVEMainnetFallback, setFxSAVEMainnetFallback] = useState<
    Array<{ price: string; decimals: number | undefined; updatedAt: string }>
  >([]);
  const [fxSAVEMainnetTables, setFxSAVEMainnetTables] = useState<
    Record<
      number,
      Array<{
        id: number;
        name: string;
        feed?: `0x${string}`;
        constraintA?: bigint;
        constraintB?: bigint;
        price?: string;
      }>
    >
  >({});
  const [wstETHMainnetFallback, setWstETHMainnetFallback] = useState<
    Array<{ price: string; decimals: number | undefined; updatedAt: string }>
  >([]);
  const [wstETHMainnetTables, setWstETHMainnetTables] = useState<
    Record<
      number,
      Array<{
        id: number;
        name: string;
        feed?: `0x${string}`;
        constraintA?: bigint;
        constraintB?: bigint;
        price?: string;
      }>
    >
  >({});
  
  // Arbitrum feed state
  const [arbitrumFeedPrices, setArbitrumFeedPrices] = useState<string[]>([]);
  const [arbitrumLatestData, setArbitrumLatestData] = useState<Array<[bigint, bigint, bigint, bigint] | undefined>>([]);
  const [arbitrumFallback, setArbitrumFallback] = useState<
    Array<{ price: string; decimals: number | undefined; updatedAt: string }>
  >([]);
  const [arbitrumTables, setArbitrumTables] = useState<
    Record<
      number,
      Array<{
        id: number;
        name: string;
        feed?: `0x${string}`;
        constraintA?: bigint;
        constraintB?: bigint;
        price?: string;
      }>
    >
  >({});
  
  // Arbitrum wstETH feed state
  const [arbitrumWstETHFeedPrices, setArbitrumWstETHFeedPrices] = useState<string[]>([]);
  const [arbitrumWstETHLatestData, setArbitrumWstETHLatestData] = useState<Array<[bigint, bigint, bigint, bigint] | undefined>>([]);
  const [arbitrumWstETHFallback, setArbitrumWstETHFallback] = useState<
    Array<{ price: string; decimals: number | undefined; updatedAt: string }>
  >([]);
  const [arbitrumWstETHTables, setArbitrumWstETHTables] = useState<
    Record<
      number,
      Array<{
        id: number;
        name: string;
        feed?: `0x${string}`;
        constraintA?: bigint;
        constraintB?: bigint;
        price?: string;
      }>
    >
  >({});
  
  // Fallback fetch for fxSAVE mainnet feeds
  useEffect(() => {
    let cancelled = false;

    async function readProxyPrice(
      addr: `0x${string}`
    ): Promise<bigint | undefined> {
      try {
        const p = await publicClient?.readContract({
          address: addr,
          abi: proxyAbi,
          functionName: "getPrice",
        });
        return p as bigint;
      } catch {}
      return undefined;
    }

    (async () => {
      if (!publicClient) return;
      const results: Array<{
        price: string;
        decimals: number | undefined;
        updatedAt: string;
      }> = [];
      for (const f of fxSAVEMainnetFeeds.slice(1)) {
        if (cancelled) break;
        const p = await readProxyPrice(f.address);
        const price = p !== undefined ? format18(p) : "-";
        results.push({ price, decimals: 18, updatedAt: "-" });
        setFxSAVEMainnetFallback([...results]);
      }
      if (!cancelled && results.length === 0) {
        setFxSAVEMainnetFallback(
          fxSAVEMainnetFeeds
            .slice(1)
            .map(() => ({ price: "-", decimals: undefined, updatedAt: "-" }))
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  // Fallback fetch for wstETH mainnet feeds
  useEffect(() => {
    let cancelled = false;

    async function readProxyPrice(
      addr: `0x${string}`
    ): Promise<bigint | undefined> {
      try {
        const p = await publicClient?.readContract({
          address: addr,
          abi: proxyAbi,
          functionName: "getPrice",
        });
        return p as bigint;
      } catch {}
      return undefined;
    }

    (async () => {
      if (!publicClient) return;
      const results: Array<{
        price: string;
        decimals: number | undefined;
        updatedAt: string;
      }> = [];
      for (const f of wstETHMainnetFeeds) {
        if (cancelled) break;
        const p = await readProxyPrice(f.address);
        const price = p !== undefined ? format18(p) : "-";
        results.push({ price, decimals: 18, updatedAt: "-" });
        setWstETHMainnetFallback([...results]);
      }
      if (!cancelled && results.length === 0) {
        setWstETHMainnetFallback(
          wstETHMainnetFeeds.map(() => ({ price: "-", decimals: undefined, updatedAt: "-" }))
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  // On-demand load of constraints + feed identifiers for fxSAVE mainnet feeds
  useEffect(() => {
    const ZERO_BYTES32 =
      "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

    async function loadFxSAVETable(idx: number) {
      const feedConfig = fxSAVEMainnetFeeds.slice(1)[idx];
      const addr = feedConfig?.address;
      if (!publicClient || !addr) return;

      const rows: Array<{
        id: number;
        name: string;
        feed?: `0x${string}`;
        constraintA?: bigint;
        constraintB?: bigint;
        price?: string;
      }> = [];

      for (const id of ids) {
        try {
          const [cons, feed] = await Promise.all([
            publicClient
              .readContract({
                address: addr,
                abi: proxyAbi,
                functionName: "getConstraints",
                args: [id],
              })
              .catch(() => null),
            publicClient
              .readContract({
                address: addr,
                abi: proxyAbi,
                functionName: "feedIdentifiers",
                args: [id],
              })
              .catch(() => null),
          ]);

          if (!cons || !feed) continue;

          const c = cons as [bigint, bigint];
          const f = feed as `0x${string}`;

          const aggAddr = bytes32ToAddress(f);

          if (!f || f === ZERO_BYTES32 || f === ZERO_ADDRESS || !aggAddr)
            continue;

          let name = deriveFeedName(f);
          let price: string | undefined;

          try {
            if (aggAddr) {
              try {
                const desc = await publicClient
                  .readContract({
                    address: aggAddr,
                    abi: aggregatorAbi,
                    functionName: "description",
                  })
                  .catch(() => null);
              if (typeof desc === "string" && desc.trim().length > 0) {
                name = desc.trim();
              }
              } catch {}

              try {
                const [dec, ans] = await Promise.all([
                  publicClient
                    .readContract({
                      address: aggAddr,
                      abi: aggregatorAbi,
                      functionName: "decimals",
                    })
                    .catch(() => null),
                  publicClient
                    .readContract({
                      address: aggAddr,
                      abi: aggregatorAbi,
                      functionName: "latestAnswer",
                    })
                    .catch(() => null),
                ]);
                if (dec !== null && ans !== null) {
                price = formatUnit(ans as bigint, Number(dec as number));
                }
              } catch {}
            }
          } catch {}

          rows.push({
            id,
            name,
            feed: f,
            constraintA: c?.[0],
            constraintB: c?.[1],
            price,
          });
        } catch (err) {
          console.warn(`Failed to load fxSAVE mainnet feed ID ${id}:`, err);
        }
      }

      setFxSAVEMainnetTables((prev) => ({ ...prev, [idx]: rows }));
    }

    if (expanded && expanded.kind === "fxSAVEMainnet" && !fxSAVEMainnetTables[expanded.idx]) {
      loadFxSAVETable(expanded.idx);
    }
  }, [expanded, ids, publicClient, fxSAVEMainnetTables]);

  // On-demand load of constraints + feed identifiers for wstETH mainnet feeds
  useEffect(() => {
    const ZERO_BYTES32 =
      "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

    async function loadWstETHTable(idx: number) {
      const feedConfig = wstETHMainnetFeeds[idx];
      const addr = feedConfig?.address;
      if (!publicClient || !addr) return;

      const rows: Array<{
        id: number;
        name: string;
        feed?: `0x${string}`;
        constraintA?: bigint;
        constraintB?: bigint;
        price?: string;
      }> = [];

      for (const id of ids) {
        try {
          const [cons, feed] = await Promise.all([
            publicClient
              .readContract({
                address: addr,
                abi: proxyAbi,
                functionName: "getConstraints",
                args: [id],
              })
              .catch(() => null),
            publicClient
              .readContract({
                address: addr,
                abi: proxyAbi,
                functionName: "feedIdentifiers",
                args: [id],
              })
              .catch(() => null),
          ]);

          if (!cons || !feed) continue;

          const c = cons as [bigint, bigint];
          const f = feed as `0x${string}`;

          const aggAddr = bytes32ToAddress(f);

          if (!f || f === ZERO_BYTES32 || f === ZERO_ADDRESS || !aggAddr)
            continue;

          let name = deriveFeedName(f);
          let price: string | undefined;

          try {
            if (aggAddr) {
              try {
                const desc = await publicClient
                  .readContract({
                    address: aggAddr,
                    abi: aggregatorAbi,
                    functionName: "description",
                  })
                  .catch(() => null);
              if (typeof desc === "string" && desc.trim().length > 0) {
                name = desc.trim();
              }
              } catch {}

              try {
                const [dec, ans] = await Promise.all([
                  publicClient
                    .readContract({
                      address: aggAddr,
                      abi: aggregatorAbi,
                      functionName: "decimals",
                    })
                    .catch(() => null),
                  publicClient
                    .readContract({
                      address: aggAddr,
                      abi: aggregatorAbi,
                      functionName: "latestAnswer",
                    })
                    .catch(() => null),
                ]);
                if (dec !== null && ans !== null) {
                price = formatUnit(ans as bigint, Number(dec as number));
                }
              } catch {}
            }
          } catch {}

          rows.push({
            id,
            name,
            feed: f,
            constraintA: c?.[0],
            constraintB: c?.[1],
            price,
          });
        } catch (err) {
          console.warn(`Failed to load wstETH mainnet feed ID ${id}:`, err);
        }
      }

      setWstETHMainnetTables((prev) => ({ ...prev, [idx]: rows }));
    }

    if (expanded && expanded.kind === "wstETHMainnet" && !wstETHMainnetTables[expanded.idx]) {
      loadWstETHTable(expanded.idx);
    }
  }, [expanded, ids, publicClient, wstETHMainnetTables]);

  // Fetch Arbitrum feed prices
  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    (async () => {
      const prices: string[] = [];
      const latest: Array<[bigint, bigint, bigint, bigint] | undefined> = [];

      for (const f of arbitrumFeeds) {
        if (cancelled) break;
        try {
          const [p, lat] = await Promise.all([
            publicClient.readContract({
              address: f.address,
              abi: proxyAbi,
              functionName: "getPrice",
            }).catch(() => null),
            publicClient.readContract({
              address: f.address,
              abi: proxyAbi,
              functionName: "latestAnswer",
            }).catch(() => null),
          ]);

          prices.push(format18(p as bigint | undefined));
          latest.push(lat as [bigint, bigint, bigint, bigint] | undefined);
        } catch (err) {
          prices.push("-");
          latest.push(undefined);
        }
      }

      if (!cancelled) {
        setArbitrumFeedPrices(prices);
        setArbitrumLatestData(latest);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  // Fallback fetch for Arbitrum feeds
  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    async function readProxyPrice(addr: `0x${string}`): Promise<bigint | undefined> {
      if (!publicClient) return undefined;
      try {
        const p = await publicClient.readContract({
          address: addr,
          abi: proxyAbi,
          functionName: "getPrice",
        });
        return p as bigint;
      } catch {}
      return undefined;
    }

    (async () => {
      const results: Array<{
        price: string;
        decimals: number | undefined;
        updatedAt: string;
      }> = [];
      for (const f of arbitrumFeeds) {
        if (cancelled) break;
        const p = await readProxyPrice(f.address);
        const price = p !== undefined ? format18(p) : "-";
        results.push({ price, decimals: 18, updatedAt: "-" });
        setArbitrumFallback([...results]);
      }
      if (!cancelled && results.length === 0) {
        setArbitrumFallback(
          arbitrumFeeds.map(() => ({ price: "-", decimals: undefined, updatedAt: "-" }))
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  // On-demand load of constraints + feed identifiers for Arbitrum proxies
  useEffect(() => {
    const ZERO_BYTES32 =
      "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

    async function loadArbitrumTable(idx: number) {
      const feedConfig = arbitrumFeeds[idx];
      const addr = feedConfig?.address;
      if (!publicClient || !addr) return;

      const rows: Array<{
        id: number;
        name: string;
        feed?: `0x${string}`;
        constraintA?: bigint;
        constraintB?: bigint;
        price?: string;
      }> = [];

      for (const id of ids) {
        try {
          const [cons, feed] = await Promise.all([
            publicClient
              .readContract({
                address: addr,
                abi: proxyAbi,
                functionName: "getConstraints",
                args: [id],
              })
              .catch(() => null),
            publicClient
              .readContract({
                address: addr,
                abi: proxyAbi,
                functionName: "feedIdentifiers",
                args: [id],
              })
              .catch(() => null),
          ]);

          if (!cons || !feed) continue;

          const c = cons as [bigint, bigint];
          const f = feed as `0x${string}`;

          const aggAddr = bytes32ToAddress(f);

          if (!f || f === ZERO_BYTES32 || f === ZERO_ADDRESS || !aggAddr)
            continue;

          let name = deriveFeedName(f);
          let price: string | undefined;

          try {
            if (aggAddr) {
              try {
                const desc = await publicClient
                  .readContract({
                    address: aggAddr,
                    abi: aggregatorAbi,
                    functionName: "description",
                  })
                  .catch(() => null);
                if (typeof desc === "string" && desc.trim().length > 0) {
                  name = desc.trim();
                }
              } catch {}

              try {
                const [dec, ans] = await Promise.all([
                  publicClient
                    .readContract({
                      address: aggAddr,
                      abi: aggregatorAbi,
                      functionName: "decimals",
                    })
                    .catch(() => null),
                  publicClient
                    .readContract({
                      address: aggAddr,
                      abi: aggregatorAbi,
                      functionName: "latestAnswer",
                    })
                    .catch(() => null),
                ]);
                if (dec !== null && ans !== null) {
                  price = formatUnit(ans as bigint, Number(dec as number));
                }
              } catch {}
            }
          } catch {}

          rows.push({
            id,
            name,
            feed: f,
            constraintA: c?.[0],
            constraintB: c?.[1],
            price,
          });
        } catch (err) {
          console.warn(`Failed to load Arbitrum feed ID ${id}:`, err);
        }
      }

      setArbitrumTables((prev) => ({ ...prev, [idx]: rows }));
    }

    if (expanded && expanded.kind === "arbitrum" && !arbitrumTables[expanded.idx]) {
      loadArbitrumTable(expanded.idx);
    }
  }, [expanded, ids, publicClient, arbitrumTables]);

  // Fetch Arbitrum wstETH feed prices
  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    (async () => {
      const prices: string[] = [];
      const latest: Array<[bigint, bigint, bigint, bigint] | undefined> = [];

      for (const f of arbitrumWstETHFeeds) {
        if (cancelled) break;
        try {
          const [p, lat] = await Promise.all([
            publicClient.readContract({
              address: f.address,
              abi: proxyAbi,
              functionName: "getPrice",
            }).catch(() => null),
            publicClient.readContract({
              address: f.address,
              abi: proxyAbi,
              functionName: "latestAnswer",
            }).catch(() => null),
          ]);

          prices.push(format18(p as bigint | undefined));
          latest.push(lat as [bigint, bigint, bigint, bigint] | undefined);
        } catch (err) {
          prices.push("-");
          latest.push(undefined);
        }
      }

      if (!cancelled) {
        setArbitrumWstETHFeedPrices(prices);
        setArbitrumWstETHLatestData(latest);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  // Fallback fetch for Arbitrum wstETH feeds
  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    async function readProxyPrice(addr: `0x${string}`): Promise<bigint | undefined> {
      if (!publicClient) return undefined;
      try {
        const p = await publicClient.readContract({
          address: addr,
          abi: proxyAbi,
          functionName: "getPrice",
        });
        return p as bigint;
      } catch {}
      return undefined;
    }

    (async () => {
      const results: Array<{
        price: string;
        decimals: number | undefined;
        updatedAt: string;
      }> = [];
      for (const f of arbitrumWstETHFeeds) {
        if (cancelled) break;
        const p = await readProxyPrice(f.address);
        const price = p !== undefined ? format18(p) : "-";
        results.push({ price, decimals: 18, updatedAt: "-" });
        setArbitrumWstETHFallback([...results]);
      }
      if (!cancelled && results.length === 0) {
        setArbitrumWstETHFallback(
          arbitrumWstETHFeeds.map(() => ({ price: "-", decimals: undefined, updatedAt: "-" }))
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  // On-demand load of constraints + feed identifiers for Arbitrum wstETH proxies
  useEffect(() => {
    const ZERO_BYTES32 =
      "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

    async function loadArbitrumWstETHTable(idx: number) {
      const feedConfig = arbitrumWstETHFeeds[idx];
      const addr = feedConfig?.address;
      if (!publicClient || !addr) return;

      const rows: Array<{
        id: number;
        name: string;
        feed?: `0x${string}`;
        constraintA?: bigint;
        constraintB?: bigint;
        price?: string;
      }> = [];

      for (const id of ids) {
        try {
          const [cons, feed] = await Promise.all([
            publicClient
              .readContract({
                address: addr,
                abi: proxyAbi,
                functionName: "getConstraints",
                args: [id],
              })
              .catch(() => null),
            publicClient
              .readContract({
                address: addr,
                abi: proxyAbi,
                functionName: "feedIdentifiers",
                args: [id],
              })
              .catch(() => null),
          ]);

          if (!cons || !feed) continue;

          const c = cons as [bigint, bigint];
          const f = feed as `0x${string}`;

          const aggAddr = bytes32ToAddress(f);

          if (!f || f === ZERO_BYTES32 || f === ZERO_ADDRESS || !aggAddr)
            continue;

          let name = deriveFeedName(f);
          let price: string | undefined;

          try {
            if (aggAddr) {
              try {
                const desc = await publicClient
                  .readContract({
                    address: aggAddr,
                    abi: aggregatorAbi,
                    functionName: "description",
                  })
                  .catch(() => null);
                if (typeof desc === "string" && desc.trim().length > 0) {
                  name = desc.trim();
                }
              } catch {}

              try {
                const [dec, ans] = await Promise.all([
                  publicClient
                    .readContract({
                      address: aggAddr,
                      abi: aggregatorAbi,
                      functionName: "decimals",
                    })
                    .catch(() => null),
                  publicClient
                    .readContract({
                      address: aggAddr,
                      abi: aggregatorAbi,
                      functionName: "latestAnswer",
                    })
                    .catch(() => null),
                ]);
                if (dec !== null && ans !== null) {
                  price = formatUnit(ans as bigint, Number(dec as number));
                }
              } catch {}
            }
          } catch {}

          rows.push({
            id,
            name,
            feed: f,
            constraintA: c?.[0],
            constraintB: c?.[1],
            price,
          });
        } catch (err) {
          console.warn(`Failed to load Arbitrum wstETH feed ID ${id}:`, err);
        }
      }

      setArbitrumWstETHTables((prev) => ({ ...prev, [idx]: rows }));
    }

    if (expanded && expanded.kind === "arbitrumWstETH" && !arbitrumWstETHTables[expanded.idx]) {
      loadArbitrumWstETHTable(expanded.idx);
    }
  }, [expanded, ids, publicClient, arbitrumWstETHTables]);

  const rows = ids
    .map((id, i) => {
      const c = data?.[2 + i * 2]?.result as [bigint, bigint] | undefined;
      const f = data?.[3 + i * 2]?.result as `0x${string}` | undefined;
      const asciiName = deriveFeedName(f);
      const aggAddr = bytes32ToAddress(f);
      const desc = aggAddr
        ? addressToDescription.get(aggAddr.toLowerCase())
        : undefined;
      const name = desc && desc.length > 0 ? desc : asciiName;
      return { id, constraintA: c?.[0], constraintB: c?.[1], feed: f, name };
    })
    .filter((r) => r.feed && r.feed !== ZERO_BYTES32);

  const primaryFeedName =
    rows[0]?.name && rows[0]?.name !== "-" ? rows[0]!.name : "fxSAVE/ETH";
  const feedLabel =
    expanded && expanded.kind === "fxSAVEMainnet"
      ? fxSAVEMainnetFeeds.slice(1)[expanded.idx]?.label || "fxSAVE/ETH"
      : expanded && expanded.kind === "wstETHMainnet"
      ? wstETHMainnetFeeds[expanded.idx]?.label || "wstETH/ETH"
      : "fxSAVE/ETH";

  return (
    <>
      <Head>
        <title>Map Room | Harbor</title>
      </Head>

      <div className="min-h-screen bg-[#1E4775] max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pb-6">
        {/* Header */}
        <div className="mb-2 relative py-2">
          {/* Title - Single Line */}
          <div className="p-2 flex items-center justify-center mb-0">
            <h1 className="font-bold font-mono text-white text-7xl text-center">
              Map Room
            </h1>
          </div>

          {/* Subheader */}
          <div className="flex items-center justify-center mb-2 -mt-2">
            <p className="text-white/80 text-lg text-center">
              Oracle feeds and price data for Harbor markets
            </p>
          </div>

          {/* Four Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Oracle Feeds Box */}
            <div className="bg-[#17395F] p-4">
              <div className="flex items-center justify-center mb-2">
                <MapIcon className="w-6 h-6 text-white mr-2" />
                <h2 className="font-bold text-white text-lg text-center">Oracle Feeds</h2>
              </div>
              <p className="text-sm text-white/80 text-center">
                View all available price feeds and oracle data
            </p>
          </div>

            {/* Price Data Box */}
            <div className="bg-[#17395F] p-4">
              <div className="flex items-center justify-center mb-2">
                <ChartBarIcon className="w-6 h-6 text-white mr-2" />
                <h2 className="font-bold text-white text-lg text-center">Price Data</h2>
              </div>
              <p className="text-sm text-white/80 text-center">
                Real-time prices and market data from Chainlink oracles
              </p>
            </div>

            {/* Contract Rates Box */}
            <div className="bg-[#17395F] p-4">
              <div className="flex items-center justify-center mb-2">
                <CpuChipIcon className="w-6 h-6 text-white mr-2" />
                <h2 className="font-bold text-white text-lg text-center">Contract Rates</h2>
              </div>
              <p className="text-sm text-white/80 text-center">
                Contract rates used for haTokens and stability pools
              </p>
            </div>

            {/* Feed Details Box */}
            <div className="bg-[#17395F] p-4">
              <div className="flex items-center justify-center mb-2">
                <InformationCircleIcon className="w-6 h-6 text-white mr-2" />
                <h2 className="font-bold text-white text-lg text-center">Feed Details</h2>
              </div>
              <p className="text-sm text-white/80 text-center">
                Detailed information about heartbeat windows and deviation thresholds
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 my-2"></div>

        {/* Feed Sections */}
        <section className="space-y-2 overflow-visible">
          {/* Mainnet fxSAVE Feeds */}
          <div className={`p-3 overflow-x-auto overflow-y-visible transition ${fxSAVEMainnetExpanded ? "bg-[#B8EBD5]" : "bg-white hover:bg-[#B8EBD5]"}`}>
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-white/10 transition py-2 px-1 rounded"
              onClick={() => setFxSAVEMainnetExpanded(!fxSAVEMainnetExpanded)}
            >
              <div className="flex items-center gap-2">
                <ChevronIcon expanded={fxSAVEMainnetExpanded} className="w-4 h-4 text-[#1E4775]" />
                <h2 className="text-sm font-semibold text-[#1E4775]">Mainnet fxSAVE Feeds</h2>
              </div>
              <div className="text-xs text-[#1E4775]/50 whitespace-nowrap">
                {fxSAVEMainnetFeeds.length} feeds
              </div>
            </div>
            {fxSAVEMainnetExpanded && (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                    <th className="py-3 px-4 font-normal text-left w-1/3">Feed</th>
                    <th className="py-3 px-4 font-normal text-left w-24">Type</th>
                    <th className="py-3 px-4 font-normal text-left">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className="border-t border-[#1E4775]/10 hover:bg-white/50 transition cursor-pointer"
                    onClick={() =>
                      setExpanded((prev) =>
                        prev?.kind === "eth" ? null : { kind: "eth" }
                      )
                    }
                  >
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <TokenIcon
                          src={getLogoPath("fxSAVE")}
                          alt="fxSAVE"
                          width={20}
                          height={20}
                          className="rounded-full flex-shrink-0"
                        />
                        <TokenIcon
                          src={getLogoPath("ETH")}
                          alt="ETH"
                          width={20}
                          height={20}
                          className="rounded-full flex-shrink-0 -ml-2"
                        />
                        <span className="text-[#1E4775] font-medium">fxSAVE/ETH</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-[#1E4775] whitespace-nowrap">Chainlink</td>
                    <td
                      className="py-2 px-4 font-mono text-[#1E4775]"
                      title={pairEstimateLabel("fxSAVE/ETH", price)}
                    >
                      {formatPairDisplay("fxSAVE/ETH", format18(price))}
                    </td>
                  </tr>
                  {fxSAVEMainnetFeeds.slice(1).map((f, idx) => {
                    const { base, quote } = parsePair(f.label);
                    return (
                      <tr
                        key={f.address}
                        className="border-t border-[#1E4775]/10 hover:bg-white/50 transition cursor-pointer"
                        onClick={() =>
                          setExpanded((prev) =>
                            prev?.kind === "fxSAVEMainnet" && prev.idx === idx
                              ? null
                              : { kind: "fxSAVEMainnet", idx }
                          )
                        }
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <TokenIcon
                              src={getLogoPath(base)}
                              alt={base}
                              width={20}
                              height={20}
                              className="rounded-full flex-shrink-0"
                            />
                            <TokenIcon
                              src={getLogoPath(quote)}
                              alt={quote}
                              width={20}
                              height={20}
                              className="rounded-full flex-shrink-0 -ml-2"
                            />
                            <span className="text-[#1E4775] font-medium">
                              {f.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4 text-[#1E4775] whitespace-nowrap">Chainlink</td>
                        <td
                          className="py-2 px-4 font-mono text-[#1E4775]"
                          title={pairEstimateLabel(
                            f.label,
                            fxSAVEMainnetReads?.[idx]?.result as bigint | undefined,
                            (fxSAVEMainnetFeedPrices[idx] || fxSAVEMainnetFallback[idx]?.price) as
                              | string
                              | undefined
                          )}
                        >
                          {formatPairDisplay(
                            f.label,
                            (fxSAVEMainnetFeedPrices[idx] ||
                              fxSAVEMainnetFallback[idx]?.price ||
                              "-") as string
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Mainnet wstETH Feeds */}
          <div className={`p-3 overflow-x-auto overflow-y-visible transition ${wstETHMainnetExpanded ? "bg-[#B8EBD5]" : "bg-white hover:bg-[#B8EBD5]"}`}>
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-white/10 transition py-2 px-1 rounded"
              onClick={() => setWstETHMainnetExpanded(!wstETHMainnetExpanded)}
            >
              <div className="flex items-center gap-2">
                <ChevronIcon expanded={wstETHMainnetExpanded} className="w-4 h-4 text-[#1E4775]" />
                <h2 className="text-sm font-semibold text-[#1E4775]">Mainnet wstETH Feeds</h2>
              </div>
              <div className="text-xs text-[#1E4775]/50 whitespace-nowrap">
                {wstETHMainnetFeeds.length} feeds
              </div>
            </div>
            {wstETHMainnetExpanded && (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                    <th className="py-3 px-4 font-normal text-left w-1/3">Feed</th>
                    <th className="py-3 px-4 font-normal text-left w-24">Type</th>
                    <th className="py-3 px-4 font-normal text-left">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {wstETHMainnetFeeds.map((f, idx) => {
                    const { base, quote } = parsePair(f.label);
                    return (
                      <tr
                        key={f.address}
                        className="border-t border-[#1E4775]/10 hover:bg-white/50 transition cursor-pointer"
                        onClick={() =>
                          setExpanded((prev) =>
                            prev?.kind === "wstETHMainnet" && prev.idx === idx
                              ? null
                              : { kind: "wstETHMainnet", idx }
                          )
                        }
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <TokenIcon
                              src={getLogoPath(base)}
                              alt={base}
                              width={20}
                              height={20}
                              className="rounded-full flex-shrink-0"
                            />
                            <TokenIcon
                              src={getLogoPath(quote)}
                              alt={quote}
                              width={20}
                              height={20}
                              className="rounded-full flex-shrink-0 -ml-2"
                            />
                            <span className="text-[#1E4775] font-medium">
                              {f.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4 text-[#1E4775] whitespace-nowrap">Chainlink</td>
                        <td
                          className="py-2 px-4 font-mono text-[#1E4775]"
                          title={pairEstimateLabel(
                            f.label,
                            wstETHMainnetReads?.[idx]?.result as bigint | undefined,
                            (wstETHMainnetFeedPrices[idx] || wstETHMainnetFallback[idx]?.price) as
                              | string
                              | undefined
                          )}
                        >
                          {formatPairDisplay(
                            f.label,
                            (wstETHMainnetFeedPrices[idx] ||
                              wstETHMainnetFallback[idx]?.price ||
                              "-") as string
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Arbitrum sUSDE Feeds */}
          <div className={`p-3 overflow-x-auto overflow-y-visible transition ${arbitrumSUSDEExpanded ? "bg-[#B8EBD5]" : "bg-white hover:bg-[#B8EBD5]"}`}>
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-white/10 transition py-2 px-1 rounded"
              onClick={() => setArbitrumSUSDEExpanded(!arbitrumSUSDEExpanded)}
            >
              <div className="flex items-center gap-2">
                <ChevronIcon expanded={arbitrumSUSDEExpanded} className="w-4 h-4 text-[#1E4775]" />
                <h2 className="text-sm font-semibold text-[#1E4775]">Arbitrum sUSDE Feeds</h2>
              </div>
              <div className="text-xs text-[#1E4775]/50 whitespace-nowrap">
                {arbitrumFeeds.length} feeds
              </div>
            </div>
            {arbitrumSUSDEExpanded && (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                    <th className="py-3 px-4 font-normal text-left w-1/3">Feed</th>
                    <th className="py-3 px-4 font-normal text-left w-24">Type</th>
                    <th className="py-3 px-4 font-normal text-left">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {arbitrumFeeds.map((f, idx) => {
                    const { base, quote } = parsePair(f.label);
                    return (
                      <tr
                        key={f.address}
                        className="border-t border-[#1E4775]/10 hover:bg-white/50 transition cursor-pointer"
                        onClick={() =>
                          setExpanded((prev) =>
                            prev?.kind === "arbitrum" && prev.idx === idx
                              ? null
                              : { kind: "arbitrum", idx }
                          )
                        }
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <TokenIcon
                              src={getLogoPath(base)}
                              alt={base}
                              width={20}
                              height={20}
                              className="rounded-full flex-shrink-0"
                            />
                            <TokenIcon
                              src={getLogoPath(quote)}
                              alt={quote}
                              width={20}
                              height={20}
                              className="rounded-full flex-shrink-0 -ml-2"
                            />
                            <span className="text-[#1E4775] font-medium">
                              {f.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4 text-[#1E4775] whitespace-nowrap">Chainlink</td>
                        <td
                          className="py-2 px-4 font-mono text-[#1E4775]"
                          title={pairEstimateLabel(
                            f.label,
                            undefined,
                            (arbitrumFeedPrices[idx] || arbitrumFallback[idx]?.price) as
                              | string
                              | undefined
                          )}
                        >
                          {formatPairDisplay(
                            f.label,
                            (arbitrumFeedPrices[idx] ||
                              arbitrumFallback[idx]?.price ||
                              "-") as string
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Arbitrum wstETH Feeds */}
          <div className={`p-3 overflow-x-auto overflow-y-visible transition ${arbitrumWstETHExpanded ? "bg-[#B8EBD5]" : "bg-white hover:bg-[#B8EBD5]"}`}>
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-white/10 transition py-2 px-1 rounded"
              onClick={() => setArbitrumWstETHExpanded(!arbitrumWstETHExpanded)}
            >
              <div className="flex items-center gap-2">
                <ChevronIcon expanded={arbitrumWstETHExpanded} className="w-4 h-4 text-[#1E4775]" />
                <h2 className="text-sm font-semibold text-[#1E4775]">Arbitrum wstETH Feeds</h2>
              </div>
              <div className="text-xs text-[#1E4775]/50 whitespace-nowrap">
                {arbitrumWstETHFeeds.length} feeds
              </div>
            </div>
            {arbitrumWstETHExpanded && (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                    <th className="py-3 px-4 font-normal text-left w-1/3">Feed</th>
                    <th className="py-3 px-4 font-normal text-left w-24">Type</th>
                    <th className="py-3 px-4 font-normal text-left">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {arbitrumWstETHFeeds.map((f, idx) => {
                    const { base, quote } = parsePair(f.label);
                    return (
                      <tr
                        key={f.address}
                        className="border-t border-[#1E4775]/10 hover:bg-white/50 transition cursor-pointer"
                        onClick={() =>
                          setExpanded((prev) =>
                            prev?.kind === "arbitrumWstETH" && prev.idx === idx
                              ? null
                              : { kind: "arbitrumWstETH", idx }
                          )
                        }
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <TokenIcon
                              src={getLogoPath(base)}
                              alt={base}
                              width={20}
                              height={20}
                              className="rounded-full flex-shrink-0"
                            />
                            <TokenIcon
                              src={getLogoPath(quote)}
                              alt={quote}
                              width={20}
                              height={20}
                              className="rounded-full flex-shrink-0 -ml-2"
                            />
                            <span className="text-[#1E4775] font-medium">
                              {f.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4 text-[#1E4775] whitespace-nowrap">Chainlink</td>
                        <td
                          className="py-2 px-4 font-mono text-[#1E4775]"
                          title={pairEstimateLabel(
                            f.label,
                            undefined,
                            (arbitrumWstETHFeedPrices[idx] || arbitrumWstETHFallback[idx]?.price) as
                              | string
                              | undefined
                          )}
                        >
                          {formatPairDisplay(
                            f.label,
                            (arbitrumWstETHFeedPrices[idx] ||
                              arbitrumWstETHFallback[idx]?.price ||
                              "-") as string
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {expanded && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4 relative">
            {/* Close Button */}
            <button
              onClick={() => setExpanded(null)}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white border border-[#1E4775]/20 hover:bg-[#1E4775]/5 transition-colors"
              aria-label="Close details"
            >
              <XMarkIcon className="w-5 h-5 text-[#1E4775]" />
            </button>
            {expanded.kind === "eth" ? (
              <>
                <div className="md:col-span-2 bg-white p-4 border border-[#1E4775]/10">
                  <div className="text-[#1E4775]/60 text-xs mb-1">
                    {feedLabel} - Price
                  </div>
                  <div className="text-2xl font-mono text-[#1E4775]">{format18(price)}</div>
                  <div className="text-[#1E4775]/40 text-xs">18 decimals</div>
                </div>
                <div className="bg-white p-4 border border-[#1E4775]/10">
                  <div className="text-[#1E4775]/60 text-xs mb-1">
                    Latest oracle feed data
                  </div>
                  <div className="space-y-1 font-mono text-[#1E4775]">
                    <div>
                      {feedLabel} min price: {format18(tuple?.[0])}
                  </div>
                    <div>
                      {feedLabel} max price: {format18(tuple?.[1])}
                </div>
                    <div>
                      {parsePair(feedLabel).base} min rate:{" "}
                      {format18(tuple?.[2])}
                    </div>
                    <div>
                      {parsePair(feedLabel).base} max rate:{" "}
                      {format18(tuple?.[3])}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-3 bg-white p-4 border border-[#1E4775]/10">
                  <div className="text-[#1E4775]/60 text-xs mb-1">Contract</div>
                  <a
                    href={etherscanAddressUrl(proxyFeeds[0].address)}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-[#1E4775] font-mono"
                  >
                    {proxyFeeds[0].address}
                    <ExternalLinkIcon />
                  </a>
                </div>
              </>
            ) : expanded.kind === "fxSAVEMainnet" ? (
              (() => {
                const idx = expanded.idx;
                const label = fxSAVEMainnetFeeds.slice(1)[idx]?.label || "Feed";
                const priceStr =
                  fxSAVEMainnetFeedPrices[idx] || fxSAVEMainnetFallback[idx]?.price || "-";
                const latest = fxSAVEMainnetLatest?.[idx]?.result as
                  | [bigint, bigint, bigint, bigint]
                  | undefined;
                return (
                  <>
                    <div className="md:col-span-2 bg-white p-4 border border-[#1E4775]/10">
                      <div className="text-[#1E4775]/60 text-xs mb-1">
                        {label} - Price
                      </div>
                      <div className="text-2xl font-mono text-[#1E4775]">{priceStr}</div>
                      <div className="text-[#1E4775]/40 text-xs">18 decimals</div>
                    </div>
                    <div className="bg-white p-4 border border-[#1E4775]/10">
                      <div className="text-[#1E4775]/60 text-xs mb-1">
                        Latest oracle feed data
                      </div>
                      <div className="space-y-1 font-mono text-[#1E4775]">
                        <div>
                          {label} min price: {format18(latest?.[0])}
                      </div>
                        <div>
                          {label} max price: {format18(latest?.[1])}
                    </div>
                        <div>
                          {parsePair(label).base} min rate:{" "}
                          {format18(latest?.[2])}
                        </div>
                        <div>
                          {parsePair(label).base} max rate:{" "}
                          {format18(latest?.[3])}
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-3 bg-white p-4 border border-[#1E4775]/10">
                      <div className="text-[#1E4775]/60 text-xs mb-1">Contract</div>
                      <a
                        href={etherscanAddressUrl(
                          fxSAVEMainnetFeeds.slice(1)[idx]?.address
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-[#1E4775] font-mono"
                      >
                        {fxSAVEMainnetFeeds.slice(1)[idx]?.address}
                        <ExternalLinkIcon />
                      </a>
                    </div>
                    <div className="md:col-span-3 bg-white p-3 sm:p-4 overflow-x-auto border border-[#1E4775]/10">
                      <table className="min-w-full text-left text-sm table-fixed">
                        <thead>
                          <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                            <th className="py-3 px-4 font-normal">ID</th>
                            <th className="py-3 px-4 font-normal">
                              Feed Name / Description
                            </th>
                            <th className="py-3 px-4 font-normal">
                              Feed Identifier
                            </th>
                            <th className="py-3 px-4 font-normal">Price</th>
                            <th className="py-3 px-4 font-normal">
                              Heartbeat Window
                            </th>
                            <th className="py-3 px-4 font-normal">
                              Deviation Threshold
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(fxSAVEMainnetTables[idx] || []).length === 0 ? (
                            <tr className="border-t border-[#1E4775]/10">
                              <td
                                colSpan={6}
                                className="py-4 px-4 text-center text-[#1E4775]/50"
                              >
                                Loading feed data...
                              </td>
                            </tr>
                          ) : (
                            (fxSAVEMainnetTables[idx] || []).map((r) => (
                              <tr
                                key={r.id}
                                className="border-t border-[#1E4775]/10"
                              >
                              <td className="py-2 px-4 font-mono text-[#1E4775]">{r.id || "-"}</td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {r.name && r.name !== "-" ? r.name : "-"}
                                </td>
                              <td className="py-2 px-4 font-mono">
                                <a
                                    href={etherscanAddressUrl(
                                      formatFeedIdentifier(r.feed)
                                    )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline text-[#1E4775]"
                                >
                                  {formatFeedIdentifier(r.feed)}
                                  <ExternalLinkIcon className="inline-block w-3 h-3 align-[-2px] ml-1" />
                                </a>
                              </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {r.price || "-"}
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {formatHeartbeat(r.constraintA)}
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {formatPercent18(r.constraintB)}
                                </td>
                            </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()
            ) : expanded.kind === "wstETHMainnet" ? (
              (() => {
                const idx = expanded.idx;
                const label = wstETHMainnetFeeds[idx]?.label || "Feed";
                const priceStr =
                  wstETHMainnetFeedPrices[idx] || wstETHMainnetFallback[idx]?.price || "-";
                const latest = wstETHMainnetLatest?.[idx]?.result as
                  | [bigint, bigint, bigint, bigint]
                  | undefined;
                return (
                  <>
                    <div className="md:col-span-2 bg-white border border-[#1E4775]/10 p-4">
                      <div className="text-[#1E4775]/60 text-xs mb-1">
                        {label} - Price
                      </div>
                      <div className="text-2xl font-mono text-[#1E4775]">{priceStr}</div>
                      <div className="text-[#1E4775]/40 text-xs">18 decimals</div>
                    </div>
                    <div className="bg-white border border-[#1E4775]/10 p-4">
                      <div className="text-[#1E4775]/60 text-xs mb-1">
                        Latest oracle feed data
                      </div>
                      <div className="space-y-1 font-mono text-[#1E4775]">
                        <div>
                          {label} min price: {format18(latest?.[0])}
                      </div>
                        <div>
                          {label} max price: {format18(latest?.[1])}
                    </div>
                        <div>
                          {parsePair(label).base} min rate:{" "}
                          {format18(latest?.[2])}
                        </div>
                        <div>
                          {parsePair(label).base} max rate:{" "}
                          {format18(latest?.[3])}
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-3 bg-white border border-[#1E4775]/10 p-4">
                      <div className="text-[#1E4775]/60 text-xs mb-1">Contract</div>
                      <a
                        href={etherscanAddressUrl(
                          wstETHMainnetFeeds[idx]?.address
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-[#1E4775] font-mono"
                      >
                        {wstETHMainnetFeeds[idx]?.address}
                        <ExternalLinkIcon />
                      </a>
                    </div>
                    <div className="md:col-span-3 bg-white border border-[#1E4775]/10 p-3 sm:p-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm table-fixed">
                        <thead>
                          <tr className="border-b border-[#1E4775]/10 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                            <th className="py-3 px-4 font-normal">ID</th>
                            <th className="py-3 px-4 font-normal">
                              Feed Name / Description
                            </th>
                            <th className="py-3 px-4 font-normal">
                              Feed Identifier
                            </th>
                            <th className="py-3 px-4 font-normal">Price</th>
                            <th className="py-3 px-4 font-normal">
                              Heartbeat Window
                            </th>
                            <th className="py-3 px-4 font-normal">
                              Deviation Threshold
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(wstETHMainnetTables[idx] || []).length === 0 ? (
                            <tr className="border-t border-[#1E4775]/10">
                              <td
                                colSpan={6}
                                className="py-4 px-4 text-center text-[#1E4775]/50"
                              >
                                Loading feed data...
                              </td>
                            </tr>
                          ) : (
                            (wstETHMainnetTables[idx] || []).map((r) => (
                              <tr
                                key={r.id}
                                className="border-t border-[#1E4775]/10"
                              >
                              <td className="py-2 px-4 font-mono text-[#1E4775]">{r.id}</td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {r.name}
                                </td>
                              <td className="py-2 px-4 font-mono">
                                <a
                                    href={etherscanAddressUrl(
                                      formatFeedIdentifier(r.feed)
                                    )}
                                  target="_blank"
                                  rel="noreferrer"
                                    className="hover:underline text-[#1E4775]"
                                  >
                                    {formatFeedIdentifier(r.feed)}
                                    <ExternalLinkIcon className="inline-block w-3 h-3 align-[-2px] ml-1" />
                                  </a>
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {r.price || "-"}
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {formatHeartbeat(r.constraintA)}
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {formatPercent18(r.constraintB)}
                                </td>
                            </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()
            ) : expanded.kind === "arbitrum" ? (
              (() => {
                const idx = expanded.idx;
                const label = arbitrumFeeds[idx]?.label || "Feed";
                const priceStr =
                  arbitrumFeedPrices[idx] || arbitrumFallback[idx]?.price || "-";
                const latest = arbitrumLatestData[idx];
                return (
                  <>
                    <div className="md:col-span-2 bg-white border border-[#1E4775]/10 p-4">
                      <div className="text-[#1E4775]/60 text-xs mb-1">
                        {label} - Price
                      </div>
                      <div className="text-2xl font-mono text-[#1E4775]">{priceStr}</div>
                      <div className="text-[#1E4775]/40 text-xs">18 decimals</div>
                    </div>
                    <div className="bg-white border border-[#1E4775]/10 p-4">
                      <div className="text-[#1E4775]/60 text-xs mb-1">
                        Latest oracle feed data
                      </div>
                      <div className="space-y-1 font-mono text-[#1E4775]">
                        <div>
                          {label} min price: {format18(latest?.[0])}
                        </div>
                        <div>
                          {label} max price: {format18(latest?.[1])}
                        </div>
                        <div>
                          {parsePair(label).base} min rate:{" "}
                          {format18(latest?.[2])}
                        </div>
                        <div>
                          {parsePair(label).base} max rate:{" "}
                          {format18(latest?.[3])}
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-3 bg-white border border-[#1E4775]/10 p-4">
                      <div className="text-[#1E4775]/60 text-xs mb-1">Contract</div>
                      <a
                        href={`https://arbiscan.io/address/${arbitrumFeeds[idx]?.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-[#1E4775] font-mono"
                      >
                        {arbitrumFeeds[idx]?.address}
                        <ExternalLinkIcon />
                      </a>
                    </div>
                    <div className="md:col-span-3 bg-white border border-[#1E4775]/10 p-3 sm:p-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm table-fixed">
                        <thead>
                          <tr className="border-b border-[#1E4775]/10 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                            <th className="py-3 px-4 font-normal">ID</th>
                            <th className="py-3 px-4 font-normal">
                              Feed Name / Description
                            </th>
                            <th className="py-3 px-4 font-normal">
                              Feed Identifier
                            </th>
                            <th className="py-3 px-4 font-normal">Price</th>
                            <th className="py-3 px-4 font-normal">
                              Heartbeat Window
                            </th>
                            <th className="py-3 px-4 font-normal">
                              Deviation Threshold
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(arbitrumTables[idx] || []).length === 0 ? (
                            <tr className="border-t border-[#1E4775]/10">
                              <td
                                colSpan={6}
                                className="py-4 px-4 text-center text-[#1E4775]/50"
                              >
                                Loading feed data...
                              </td>
                            </tr>
                          ) : (
                            (arbitrumTables[idx] || []).map((r) => (
                              <tr
                                key={r.id}
                                className="border-t border-[#1E4775]/10"
                              >
                                <td className="py-2 px-4 font-mono text-[#1E4775]">{r.id}</td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {r.name}
                                </td>
                                <td className="py-2 px-4 font-mono">
                                  <a
                                    href={`https://arbiscan.io/address/${formatFeedIdentifier(r.feed)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline text-[#1E4775]"
                                  >
                                    {formatFeedIdentifier(r.feed)}
                                    <ExternalLinkIcon className="inline-block w-3 h-3 align-[-2px] ml-1" />
                                  </a>
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {r.price || "-"}
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {formatHeartbeat(r.constraintA)}
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {formatPercent18(r.constraintB)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()
            ) : expanded.kind === "arbitrumWstETH" ? (
              (() => {
                const idx = expanded.idx;
                const label = arbitrumWstETHFeeds[idx]?.label || "Feed";
                const priceStr =
                  arbitrumWstETHFeedPrices[idx] || arbitrumWstETHFallback[idx]?.price || "-";
                const latest = arbitrumWstETHLatestData[idx];
                return (
                  <>
                    <div className="md:col-span-2 bg-white border border-[#1E4775]/10 p-4">
                      <div className="text-[#1E4775]/60 text-xs mb-1">
                        {label} - Price
                      </div>
                      <div className="text-2xl font-mono text-[#1E4775]">{priceStr}</div>
                      <div className="text-[#1E4775]/40 text-xs">18 decimals</div>
                    </div>
                    <div className="bg-white border border-[#1E4775]/10 p-4">
                      <div className="text-[#1E4775]/60 text-xs mb-1">
                        Latest oracle feed data
                      </div>
                      <div className="space-y-1 font-mono text-[#1E4775]">
                        <div>
                          {label} min price: {format18(latest?.[0])}
                        </div>
                        <div>
                          {label} max price: {format18(latest?.[1])}
                        </div>
                        <div>
                          {parsePair(label).base} min rate:{" "}
                          {format18(latest?.[2])}
                        </div>
                        <div>
                          {parsePair(label).base} max rate:{" "}
                          {format18(latest?.[3])}
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-3 bg-white border border-[#1E4775]/10 p-4">
                      <div className="text-[#1E4775]/60 text-xs mb-1">Contract</div>
                      <a
                        href={`https://arbiscan.io/address/${arbitrumWstETHFeeds[idx]?.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-[#1E4775] font-mono"
                      >
                        {arbitrumWstETHFeeds[idx]?.address}
                        <ExternalLinkIcon />
                      </a>
                    </div>
                    <div className="md:col-span-3 bg-white border border-[#1E4775]/10 p-3 sm:p-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm table-fixed">
                        <thead>
                          <tr className="border-b border-[#1E4775]/10 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                            <th className="py-3 px-4 font-normal">ID</th>
                            <th className="py-3 px-4 font-normal">
                              Feed Name / Description
                            </th>
                            <th className="py-3 px-4 font-normal">
                              Feed Identifier
                            </th>
                            <th className="py-3 px-4 font-normal">Price</th>
                            <th className="py-3 px-4 font-normal">
                              Heartbeat Window
                            </th>
                            <th className="py-3 px-4 font-normal">
                              Deviation Threshold
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(arbitrumWstETHTables[idx] || []).length === 0 ? (
                            <tr className="border-t border-[#1E4775]/10">
                              <td
                                colSpan={6}
                                className="py-4 px-4 text-center text-[#1E4775]/50"
                              >
                                Loading feed data...
                              </td>
                            </tr>
                          ) : (
                            (arbitrumWstETHTables[idx] || []).map((r) => (
                              <tr
                                key={r.id}
                                className="border-t border-[#1E4775]/10"
                              >
                                <td className="py-2 px-4 font-mono text-[#1E4775]">{r.id}</td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {r.name}
                                </td>
                                <td className="py-2 px-4 font-mono">
                                  <a
                                    href={`https://arbiscan.io/address/${formatFeedIdentifier(r.feed)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline text-[#1E4775]"
                                  >
                                    {formatFeedIdentifier(r.feed)}
                                    <ExternalLinkIcon className="inline-block w-3 h-3 align-[-2px] ml-1" />
                                  </a>
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {r.price || "-"}
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {formatHeartbeat(r.constraintA)}
                                </td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">
                                  {formatPercent18(r.constraintB)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()
            ) : null}
          </section>
        )}

        {expanded && expanded.kind === "eth" && (
          <section>
            <div className="bg-white border border-[#1E4775]/10 p-3 sm:p-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm table-fixed">
                <thead>
                  <tr className="border-b border-[#1E4775]/10 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                    <th className="py-3 px-4 font-normal">ID</th>
                    <th className="py-3 px-4 font-normal">
                      Feed Name / Description
                    </th>
                    <th className="py-3 px-4 font-normal">Feed Identifier</th>
                    <th className="py-3 px-4 font-normal">Price</th>
                    <th className="py-3 px-4 font-normal">Heartbeat Window</th>
                    <th className="py-3 px-4 font-normal">
                      Deviation Threshold
                    </th>
                  </tr>
                </thead>
                <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-[#1E4775]/10">
                    <td className="py-2 px-4 font-mono text-[#1E4775]">{r.id}</td>
                    <td className="py-2 px-4 font-mono text-[#1E4775]">{r.name}</td>
                    <td className="py-2 px-4 font-mono">
                      <a
                          href={etherscanAddressUrl(
                            formatFeedIdentifier(r.feed)
                          )}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-[#1E4775]"
                      >
                        {formatFeedIdentifier(r.feed)}
                        <ExternalLinkIcon className="inline-block w-3 h-3 align-[-2px] ml-1" />
                      </a>
                    </td>
                    <td className="py-2 px-4 font-mono text-[#1E4775]">
                      {(() => {
                          const dec = aggDecReads?.[i]?.result as
                            | number
                            | undefined;
                          const ans = aggAnsReads?.[i]?.result as
                            | bigint
                            | undefined;
                          if (dec === undefined || ans === undefined)
                            return "-";
                        return formatUnit(ans, dec, 6);
                      })()}
                    </td>
                      <td className="py-2 px-4 font-mono text-[#1E4775]">
                        {formatHeartbeat(r.constraintA)}
                      </td>
                      <td className="py-2 px-4 font-mono text-[#1E4775]">
                        {formatPercent18(r.constraintB)}
                      </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
    </>
  );
}
