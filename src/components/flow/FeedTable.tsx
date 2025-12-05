// components/map-room/FeedTable.tsx

import type { FeedEntry } from "@/config/feeds";

export function FeedTable({ feeds }: { feeds: readonly FeedEntry[] }) {
    return (
        <table className="w-full border-collapse">
            <thead>
            <tr className="text-left text-sm text-muted-foreground border-b">
                <th className="py-2">Base</th>
                <th className="py-2">Quote</th>
                <th className="py-2">Address</th>
            </tr>
            </thead>
            <tbody>
            {feeds.map((feed) => (
                <tr key={feed.address} className="border-b last:border-none">
                    <td className="py-2">{feed.label.split("/")[0]}</td>
                    <td className="py-2">{feed.label.split("/")[1]}</td>
                    <td className="py-2 font-mono text-xs">{feed.address}</td>
                </tr>
            ))}
            </tbody>
        </table>
    );
}
