/**
 * Redact URLs and secrets from logs to avoid leaking API keys (Alchemy, Graph, etc.).
 */

/** Alchemy-style path: /v2/KEY -> /v2/[REDACTED] */
const ALCHEMY_V2_RE = /\/v2\/[^/?#]+/g;
/** Query params: api_key=..., token=..., key=... */
const API_KEY_PARAM_RE = /([?&])(api_key|token|key)=[^&\s]+/gi;
/** Bearer token in string */
const BEARER_RE = /Bearer\s+[^\s]+/gi;

const REDACTED = "[REDACTED]";

/**
 * Redacts Alchemy-style keys (/v2/...), api_key/token query params, and Bearer tokens in a URL.
 * Use when logging a URL that might contain secrets.
 */
export function redactUrl(url: string | null | undefined): string {
  if (url == null || typeof url !== "string") return String(url ?? "");
  let out = url
    .replace(ALCHEMY_V2_RE, "/v2/" + REDACTED)
    .replace(API_KEY_PARAM_RE, "$1$2=" + REDACTED)
    .replace(BEARER_RE, "Bearer " + REDACTED);
  return out;
}

/**
 * Same redaction for arbitrary strings (e.g. error.message that might contain a URL).
 * Use when logging error messages or any string that could contain a secret URL.
 */
export function redactForLog(message: string | null | undefined): string {
  if (message == null) return "";
  if (typeof message !== "string") return redactForLog(String(message));
  return message
    .replace(ALCHEMY_V2_RE, "/v2/" + REDACTED)
    .replace(API_KEY_PARAM_RE, "$1$2=" + REDACTED)
    .replace(BEARER_RE, "Bearer " + REDACTED);
}

/** True when NEXT_PUBLIC_APP_ENV === "production". For optional "log only in dev" logic. */
export const isProduction =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_ENV === "production";
