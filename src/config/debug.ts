/**
 * Debug flags for verbose logging. Set NEXT_PUBLIC_DEBUG_ANCHOR=true in .env.local
 * to enable anchor-related debug logs (APR calculations, price flows, etc.).
 * By default these are off to reduce console noise.
 */
export const DEBUG_ANCHOR =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEBUG_ANCHOR === "true";
