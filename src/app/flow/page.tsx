"use client";

import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import { useAccount, useContractReads, usePublicClient } from "wagmi";
import {
  MapIcon,
  ChartBarIcon,
  CpuChipIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Proxy price feeds
const proxyFeeds = [
  {
    label: "fxSAVE/ETH",
    address: "0x876d471068e723279Fe52Eb10A6A587cA1a26CA4" as const,
  },
  {
    label: "fxSAVE/BTC",
    address: "0xA3174691290D9F0D8Fe3E98D8222441e117d1c46" as const,
  },
  {
    label: "fxSAVE/EUR",
    address: "0xBFf03dF70F0da9A31B775cba6A338B9BC6d7991b" as const,
  },
  {
    label: "fxSAVE/XAU",
    address: "0x946178bAE2CD22b096489c9e183186235CbdE90f" as const,
  },
  {
    label: "fxSAVE/MCAP",
    address: "0x011b5b823663C76dc70411C2be32124372464575" as const,
  },
  {
    label: "wstETH/ETH",
    address: "0xE1CF94253EF9F9d01FDd5fDdd54fDE1D1Fd7F5A6" as const,
  },
  {
    label: "wstETH/BTC",
    address: "0x242f9504864776Be37752050EdA0F4ac33a565C4" as const,
  },
  {
    label: "wstETH/EUR",
    address: "0x939dE020A9242b6f632BB6A47F9CE8Db897F8C38" as const,
  },
  {
    label: "wstETH/XAU",
    address: "0x6cC54EF252B498B0Efb0b6d450a09EE5833104b2" as const,
  },
  {
    label: "wstETH/MCAP",
    address: "0x66de75651060d9EC7218abCc7a2e4400525a1B6E" as const,
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
    null | { kind: "eth" } | { kind: "extra"; idx: number }
  >(null);
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

  // Fetch price for proxyFeeds[1..] using proxy ABI getPrice()
  const { data: extraReads } = useContractReads({
    contracts: proxyFeeds.slice(1).map((f) => ({
      address: f.address,
      abi: proxyAbi,
      functionName: "getPrice" as const,
    })),
    query: { enabled: proxyFeeds.length > 1 },
  });

  // Read latestAnswer() tuples for non-ETH feeds to show details in expanded view
  const { data: extraLatest } = useContractReads({
    contracts: proxyFeeds.slice(1).map((f) => ({
      address: f.address,
      abi: proxyAbi,
      functionName: "latestAnswer" as const,
    })),
    query: { enabled: proxyFeeds.length > 1 },
  });

  const extraFeedPrices = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < proxyFeeds.length - 1; i += 1) {
      const p = extraReads?.[i]?.result as bigint | undefined;
      const feed = proxyFeeds.slice(1)[i];
      out.push(format18(p));
    }
    return out;
  }, [extraReads]);

  // Fallback fetch via public client to ensure extra feeds resolve on forks
  const publicClient = usePublicClient();
  const [extraFallback, setExtraFallback] = useState<
    Array<{ price: string; decimals: number | undefined; updatedAt: string }>
  >([]);
  const [extraTables, setExtraTables] = useState<
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
      for (const f of proxyFeeds.slice(1)) {
        if (cancelled) break;
        const p = await readProxyPrice(f.address);
        const price = p !== undefined ? format18(p) : "-";
        results.push({ price, decimals: 18, updatedAt: "-" });
        setExtraFallback([...results]);
      }
      if (!cancelled && results.length === 0) {
        setExtraFallback(
          proxyFeeds
            .slice(1)
            .map(() => ({ price: "-", decimals: undefined, updatedAt: "-" }))
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  // On-demand load of constraints + feed identifiers for non-ETH proxies
  useEffect(() => {
    const ZERO_BYTES32 =
      "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

    async function loadTable(idx: number) {
      const feedConfig = proxyFeeds.slice(1)[idx];
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

          // Convert bytes32 to address
          const aggAddr = bytes32ToAddress(f);

          // Skip zero addresses
          if (!f || f === ZERO_BYTES32 || f === ZERO_ADDRESS || !aggAddr)
            continue;

          // Try to resolve human-readable name via aggregator description
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
          console.warn(`Failed to load feed ID ${id}:`, err);
        }
      }

      setExtraTables((prev) => ({ ...prev, [idx]: rows }));
    }

    if (expanded && expanded.kind === "extra" && !extraTables[expanded.idx]) {
      loadTable(expanded.idx);
    }
  }, [expanded, ids, publicClient, extraTables]);

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
    expanded && expanded.kind === "extra"
      ? proxyFeeds.slice(1)[expanded.idx]?.label || "fxSAVE/ETH"
      : "fxSAVE/ETH";

  return (
    <>
      <Head>
        <title>Map Room | Harbor</title>
      </Head>

      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pb-6">
          {/* Header */}
          <div className="mb-2">
            {/* Title - Full Row */}
            <div className="p-4 flex items-center justify-center mb-0">
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
                  <h2 className="font-bold text-white text-lg text-center">
                    Oracle Feeds
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  View all available price feeds and oracle data
                </p>
              </div>

              {/* Price Data Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ChartBarIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Price Data
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Real-time prices and market data from Chainlink oracles
                </p>
              </div>

              {/* Contract Rates Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <CpuChipIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Contract Rates
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Contract rates used for haTokens and stability pools
                </p>
              </div>

              {/* Feed Details Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <InformationCircleIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Feed Details
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Detailed information about heartbeat windows and deviation
                  thresholds
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Feeds list (hardcoded for now) */}
          <section className="mb-6">
            <div className="bg-[#17395F] p-3 sm:p-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-white/90">Feeds</h2>
                <div className="text-xs text-white/50">
                  {proxyFeeds.length} feeds
                </div>
              </div>
              <table className="min-w-full text-left text-sm table-fixed">
                <thead>
                  <tr className="border-b border-white/10 uppercase tracking-wider text-[10px] text-white/60">
                    <th className="py-3 px-4 font-normal">Feed</th>
                    <th className="w-32 py-3 px-4 font-normal">Type</th>
                    <th className="w-72 py-3 px-4 font-normal">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className="border-t border-white/10 hover:bg-white/5 transition cursor-pointer"
                    onClick={() =>
                      setExpanded((prev) =>
                        prev?.kind === "eth" ? null : { kind: "eth" }
                      )
                    }
                  >
                    <td className="py-2 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <span className="text-white font-medium">
                          fxSAVE/ETH
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4">Chainlink</td>
                    <td
                      className="py-2 px-4 font-mono"
                      title={pairEstimateLabel("fxSAVE/ETH", price)}
                    >
                      {formatPairDisplay("fxSAVE/ETH", format18(price))}
                    </td>
                  </tr>
                  {proxyFeeds.slice(1).map((f, idx) => (
                    <tr
                      key={f.address}
                      className="border-t border-white/10 hover:bg-white/5 transition cursor-pointer"
                      onClick={() =>
                        setExpanded((prev) =>
                          prev?.kind === "extra" && prev.idx === idx
                            ? null
                            : { kind: "extra", idx }
                        )
                      }
                    >
                      <td className="py-2 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <span className="text-white font-medium">
                            {f.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-4">Chainlink</td>
                      <td
                        className="py-2 px-4 font-mono"
                        title={pairEstimateLabel(
                          f.label,
                          extraReads?.[idx]?.result as bigint | undefined,
                          (extraFeedPrices[idx] ||
                            extraFallback[idx]?.price) as string | undefined
                        )}
                      >
                        {formatPairDisplay(
                          f.label,
                          (extraFeedPrices[idx] ||
                            extraFallback[idx]?.price ||
                            "-") as string
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {expanded && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {expanded.kind === "eth" ? (
                <>
                  <div className="md:col-span-2 bg-[#17395F] p-4">
                    <div className="text-white/60 text-xs mb-1">
                      {feedLabel} - Price
                    </div>
                    <div className="text-2xl font-mono">{format18(price)}</div>
                    <div className="text-white/40 text-xs">18 decimals</div>
                  </div>
                  <div className="bg-[#17395F] p-4">
                    <div className="text-white/60 text-xs mb-1">
                      Latest oracle feed data
                    </div>
                    <div className="space-y-1 font-mono">
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
                  <div className="md:col-span-3 bg-[#17395F] p-4">
                    <div className="text-white/60 text-xs mb-1">Contract</div>
                    <a
                      href={etherscanAddressUrl(proxyFeeds[0].address)}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {proxyFeeds[0].address}
                      <ExternalLinkIcon />
                    </a>
                  </div>
                </>
              ) : (
                (() => {
                  const idx = expanded.idx;
                  const label = proxyFeeds.slice(1)[idx]?.label || "Feed";
                  const priceStr =
                    extraFeedPrices[idx] || extraFallback[idx]?.price || "-";
                  const latest = extraLatest?.[idx]?.result as
                    | [bigint, bigint, bigint, bigint]
                    | undefined;
                  const decimalsStr = (extraFallback[idx]?.decimals ?? 18) as
                    | number
                    | undefined;
                  const updatedStr = extraFallback[idx]?.updatedAt || "-";
                  return (
                    <>
                      <div className="md:col-span-2 bg-[#17395F] p-4">
                        <div className="text-white/60 text-xs mb-1">
                          {label} - Price
                        </div>
                        <div className="text-2xl font-mono">{priceStr}</div>
                        <div className="text-white/40 text-xs">18 decimals</div>
                      </div>
                      <div className="bg-[#17395F] p-4">
                        <div className="text-white/60 text-xs mb-1">
                          Latest oracle feed data
                        </div>
                        <div className="space-y-1 font-mono">
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
                      <div className="md:col-span-3 bg-[#17395F] p-4">
                        <div className="text-white/60 text-xs mb-1">
                          Contract
                        </div>
                        <a
                          href={etherscanAddressUrl(
                            proxyFeeds.slice(1)[idx]?.address
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {proxyFeeds.slice(1)[idx]?.address}
                          <ExternalLinkIcon />
                        </a>
                      </div>
                      <div className="md:col-span-3 bg-[#17395F] p-3 sm:p-4 overflow-x-auto">
                        <table className="min-w-full text-left text-sm table-fixed">
                          <thead>
                            <tr className="border-b border-white/10 uppercase tracking-wider text-[10px] text-white/60">
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
                            {(extraTables[idx] || []).length === 0 ? (
                              <tr className="border-t border-white/10">
                                <td
                                  colSpan={6}
                                  className="py-4 px-4 text-center text-white/50"
                                >
                                  Loading feed data...
                                </td>
                              </tr>
                            ) : (
                              (extraTables[idx] || []).map((r) => (
                                <tr
                                  key={r.id}
                                  className="border-t border-white/10"
                                >
                                  <td className="py-2 px-4 font-mono">
                                    {r.id}
                                  </td>
                                  <td className="py-2 px-4 font-mono">
                                    {r.name}
                                  </td>
                                  <td className="py-2 px-4 font-mono">
                                    <a
                                      href={etherscanAddressUrl(
                                        formatFeedIdentifier(r.feed)
                                      )}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="hover:underline"
                                    >
                                      {formatFeedIdentifier(r.feed)}
                                      <ExternalLinkIcon className="inline-block w-3 h-3 align-[-2px] ml-1" />
                                    </a>
                                  </td>
                                  <td className="py-2 px-4 font-mono">
                                    {r.price || "-"}
                                  </td>
                                  <td className="py-2 px-4 font-mono">
                                    {formatHeartbeat(r.constraintA)}
                                  </td>
                                  <td className="py-2 px-4 font-mono">
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
              )}
            </section>
          )}

          {expanded && expanded.kind === "eth" && (
            <section>
              <div className="bg-[#17395F] p-3 sm:p-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm table-fixed">
                  <thead>
                    <tr className="border-b border-white/10 uppercase tracking-wider text-[10px] text-white/60">
                      <th className="py-3 px-4 font-normal">ID</th>
                      <th className="py-3 px-4 font-normal">
                        Feed Name / Description
                      </th>
                      <th className="py-3 px-4 font-normal">Feed Identifier</th>
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
                    {rows.map((r, i) => (
                      <tr key={r.id} className="border-t border-white/10">
                        <td className="py-2 px-4 font-mono">{r.id}</td>
                        <td className="py-2 px-4 font-mono">{r.name}</td>
                        <td className="py-2 px-4 font-mono">
                          <a
                            href={etherscanAddressUrl(
                              formatFeedIdentifier(r.feed)
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {formatFeedIdentifier(r.feed)}
                            <ExternalLinkIcon className="inline-block w-3 h-3 align-[-2px] ml-1" />
                          </a>
                        </td>
                        <td className="py-2 px-4 font-mono">
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
                        <td className="py-2 px-4 font-mono">
                          {formatHeartbeat(r.constraintA)}
                        </td>
                        <td className="py-2 px-4 font-mono">
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
