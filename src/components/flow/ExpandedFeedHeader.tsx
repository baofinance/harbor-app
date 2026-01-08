import { XMarkIcon } from "@heroicons/react/24/outline";
import { feeds as feedsConfig } from "@/config/feeds";
import type { ExpandedState } from "@/hooks/useFeedFilters";

interface ExpandedFeedHeaderProps {
  expanded: ExpandedState;
  onClose: () => void;
}

export function ExpandedFeedHeader({ expanded, onClose }: ExpandedFeedHeaderProps) {
  if (!expanded) return null;

  // Get the feed label for the header
  const networkFeeds = feedsConfig[expanded.network as keyof typeof feedsConfig];
  const baseAssetFeeds = networkFeeds?.[expanded.token as keyof typeof networkFeeds];
  const feed = baseAssetFeeds?.[expanded.feedIndex];
  const feedLabel = feed?.label || "Feed";

  return (
    <div className="bg-[#FF8A7A] border border-[#1E4775] p-4 mb-2 mt-2">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white text-lg">
          Details - {feedLabel}
        </h2>
        <button
          onClick={onClose}
          className="text-white hover:text-white/80 transition-colors"
          aria-label="Close details"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
