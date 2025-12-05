import { FeedHeader } from "./FeedHeader";
import { FeedTable } from "./FeedTable";
import type { FeedEntry } from "@/config/feeds";

export function FeedSection({
                                title,
                                feeds,
                            }: {
    title: string;
    feeds: readonly FeedEntry[];
}) {
    return (
        <div className="space-y-2">
            <FeedHeader title={title} />
            <FeedTable feeds={feeds} />
        </div>
    );
}
