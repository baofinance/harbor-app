import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function format18(value?: bigint, maxFrac = 6) {
    if (value === undefined) return "-";
    const n = Number(value) / 1e18;
    return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

export function formatUnit(value?: bigint, decimals?: number, maxFrac = 6) {
    if (value === undefined || decimals === undefined) return "-";
    const n = Number(value) / 10 ** decimals;
    return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

export function parsePair(label: string) {
    const [base, quote] = label.split("/");
    return { base, quote: quote || "" };
}

export function deriveFeedName(bytes?: `0x${string}`) {
    if (!bytes) return "-";
    try {
        const hex = bytes.slice(2);
        const raw = Array.from({ length: hex.length / 2 }, (_, i) =>
            String.fromCharCode(parseInt(hex.substr(i * 2, 2), 16))
        ).join("");
        return raw.replace(/\u0000+$/g, "").replace(/[^\x20-\x7E]/g, "").trim() || "-";
    } catch {
        return "-";
    }
}

export function bytes32ToAddress(bytes?: `0x${string}`) {
    if (!bytes || bytes.length !== 66) return undefined;
    return `0x${bytes.slice(-40)}` as `0x${string}`;
}

export function formatPairDisplay(pair: string, price: string | number | undefined) {
    if (!price || price === "-") return "-";
    return `${price}`;
}

export function pairEstimateLabel(
    pair: string,
    readValue?: bigint,
    price?: string
) {
    return `${pair}\nRead Value: ${readValue}\nPrice: ${price}`;
}
