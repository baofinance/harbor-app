"use client";

import { wagmiConfig } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { CurrencyProvider, type CurrencyCode } from "./CurrencyContext";
import { SafeAppProviderWrapper } from "@/components/SafeAppProvider";

// Set up queryClient
const queryClient = new QueryClient();

function parseCookieValue(
 cookies: string | null,
 key: string
): string | undefined {
 if (!cookies) return undefined;
 const parts = cookies.split(";").map((s) => s.trim());
 const match = parts.find((p) => p.startsWith(`${key}=`));
 return match ? decodeURIComponent(match.split("=")[1]) : undefined;
}

const allowedCodes: readonly CurrencyCode[] = [
"USD",
"EUR",
"JPY",
"GBP",
] as const;
function isCurrencyCode(value: unknown): value is CurrencyCode {
 return (
 typeof value ==="string" &&
 (allowedCodes as readonly string[]).includes(value)
 );
}

function ContextProvider({
 children,
 cookies,
}: Readonly<{
 children: React.ReactNode;
 cookies: string | null;
}>) {
 // Defensive: malformed or poisoned cookies can cause cookieToInitialState to throw
 let initialState: unknown;
 try {
   initialState = cookieToInitialState(
     wagmiConfig as unknown as Config,
     cookies
   );
 } catch (e) {
   if (typeof window !== "undefined") {
     console.warn("[ContextProvider] cookieToInitialState failed, using fresh state:", e);
   }
   initialState = undefined;
 }

 const cookieCurrency = parseCookieValue(cookies,"currency");
 const initialCurrency = isCurrencyCode(cookieCurrency)
 ? cookieCurrency
 : undefined;

 return (
 <WagmiProvider
 config={wagmiConfig as unknown as Config}
 initialState={initialState}
 >
 <QueryClientProvider client={queryClient}>
<SafeAppProviderWrapper>
 <CurrencyProvider initialCode={initialCurrency}>
 {children}
 </CurrencyProvider>
</SafeAppProviderWrapper>
 </QueryClientProvider>
 </WagmiProvider>
 );
}

export default ContextProvider;
