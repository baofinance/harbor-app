"use client";

export type IndexMarketsLoadErrorProps = {
  onRetry: () => void;
  message?: string;
};

export function IndexMarketsLoadError({
  onRetry,
  message = "Error loading markets",
}: IndexMarketsLoadErrorProps) {
  return (
    <div className="bg-[#17395F] border border-white/10 p-6 rounded-lg text-center">
      <p className="text-white text-lg font-medium mb-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-[#FF8A7A] text-white rounded hover:bg-[#FF6B5A] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
