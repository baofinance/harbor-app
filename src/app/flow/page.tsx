"use client";

import { useState } from "react";
import { NETWORKS, type Network } from "@/config/networks";
import {Feeds, feeds, TokenSymbol} from "@/config/feeds";

import { useFeedGroup } from "@/hooks/useFeedGroup";
import { useFeedPrices } from "@/hooks/useFeedPrices";
import { useFeedReads } from "@/hooks/useFeedReads";

import { ChevronIcon } from "@/components/icons/ChevronIcon";
import TokenIcon from "@/components/TokenIcon";
import { parsePair } from "@/lib/utils";
import { MapIcon, ChartBarIcon, CpuChipIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

import { getLogoPath } from "@/lib/logos";

export default function MapRoomPage() {
    return (
        <div className="min-h-screen bg-[#1E4775] max-w-[1300px] mx-auto font-sans relative">
            <main className="container mx-auto px-4 sm:px-10 pb-6">
                {/* Header */}
                <div className="mb-2 relative py-2">
                    <div className="p-2 flex items-center justify-center mb-0">
                        <h1 className="font-bold font-mono text-white text-7xl text-center">
                            Map Room
                        </h1>
                    </div>
                    <div className="flex items-center justify-center mb-2 -mt-2">
                        <p className="text-white/80 text-lg text-center">
                            Oracle feeds and price data for Harbor markets
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        <FeatureBox icon={MapIcon} title="Oracle Feeds" description="View all available price feeds and oracle data" />
                        <FeatureBox icon={ChartBarIcon} title="Price Data" description="Real-time prices and market data from Chainlink oracles" />
                        <FeatureBox icon={CpuChipIcon} title="Contract Rates" description="Contract rates used for haTokens and stability pools" />
                        <FeatureBox icon={InformationCircleIcon} title="Feed Details" description="Detailed info about heartbeat windows & deviation thresholds" />
                    </div>
                </div>

                {/* Feeds Sections */}
                <div className="space-y-3">
                    {NETWORKS.map((network) => (
                        <NetworkFeedGroups key={network} network={network} />
                    ))}
                </div>
            </main>
        </div>
    );
}

function FeatureBox({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
    return (
        <div className="bg-[#17395F] p-4">
            <div className="flex items-center justify-center mb-2">
                <Icon className="w-6 h-6 text-white mr-2" />
                <h2 className="font-bold text-white text-lg text-center">{title}</h2>
            </div>
            <p className="text-sm text-white/80 text-center">{description}</p>
        </div>
    );
}

function NetworkFeedGroups({ network }: { network: Network }) {
    const tokenGroups = Object.entries(feeds[network])
        .filter(([, tokens]) => tokens.length > 0)
        .map(([key]) => key as TokenSymbol<typeof network>);
    return (
        <>
            {tokenGroups.map((token) => (
                <FeedGroupSection
                    key={`${network}-${token}`}
                    network={network}
                    token={token}
                />
            ))}
        </>
    );
}


function FeedGroupSection<N extends Network>({
    network,
    token,
}: {
    network: N;
    token: TokenSymbol<N>;
}) {
    const { entries } = useFeedGroup(network, token);
    const { prices } = useFeedPrices(entries);
    const { reads } = useFeedReads(entries);

    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`p-3 overflow-x-auto transition ${expanded ? "bg-[#B8EBD5]" : "bg-white hover:bg-[#B8EBD5]"}`}>
            <div
                className="flex items-center justify-between cursor-pointer hover:bg-white/10 transition py-2 px-1 rounded"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <ChevronIcon expanded={expanded} className="w-4 h-4 text-[#1E4775]" />
                    <h2 className="text-sm font-semibold text-[#1E4775]">
                        {network} {String(token)} Feeds
                    </h2>
                </div>
                <div className="text-xs text-[#1E4775]/50 whitespace-nowrap">{entries.length} feeds</div>
            </div>

            {expanded && (
                <table className="min-w-full text-left text-sm">
                    <thead>
                    <tr className="border-b border-[#1E4775]/20 uppercase tracking-wider text-[10px] text-[#1E4775]/60">
                        <th className="py-3 px-4 font-normal text-left w-1/3">Feed</th>
                        <th className="py-3 px-4 font-normal text-left w-24">Type</th>
                        <th className="py-3 px-4 font-normal text-left">Price</th>
                    </tr>
                    </thead>
                    <tbody>
                    {entries.map((f, idx) => {
                        const pair = parsePair(f.label); // { base, quote }
                        const price = prices[idx] ?? "-";

                        return (
                            <tr key={f.address} className="border-t border-[#1E4775]/10 hover:bg-white/50 transition">
                                <td className="py-2 px-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <TokenIcon
                                            src={getLogoPath(pair.base)}
                                            alt={pair.base}
                                            width={20}
                                            height={20}
                                            className="rounded-full"
                                        />
                                        <TokenIcon
                                            src={getLogoPath(pair.quote)}
                                            alt={pair.quote}
                                            width={20}
                                            height={20}
                                            className="rounded-full -ml-2"
                                        />
                                        <span className="text-[#1E4775] font-medium">{f.label}</span>
                                    </div>
                                </td>
                                <td className="py-2 px-4 text-[#1E4775] whitespace-nowrap">Chainlink</td>
                                <td className="py-2 px-4 font-mono text-[#1E4775]">{price}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
