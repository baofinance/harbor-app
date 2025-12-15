import type { FeedEntry } from "@/config/feeds";

export function FeedStats({ feed }: { feed: FeedEntry }) {
 return (
 <div className="text-xs text-muted-foreground flex flex-col gap-1">
 <div>Label: {feed.label}</div>
 <div>Address: {feed.address}</div>
 </div>
 );
}
