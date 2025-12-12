"use client";

import { wagmiConfig } from"@/config";
import { QueryClient, QueryClientProvider } from"@tanstack/react-query";
import React, { type ReactNode } from"react";
import { cookieToInitialState, WagmiProvider, type Config } from"wagmi";
import { CurrencyProvider, type CurrencyCode } from"./CurrencyContext";

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
 const initialState = cookieToInitialState(
 wagmiConfig as unknown as Config,
 cookies
 );

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
 <CurrencyProvider initialCode={initialCurrency}>
 {children}
 </CurrencyProvider>
 </QueryClientProvider>
 </WagmiProvider>
 );
}

export default ContextProvider;
