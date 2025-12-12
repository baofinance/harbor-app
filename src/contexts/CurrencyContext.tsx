"use client";

import React, {
 createContext,
 useContext,
 useMemo,
 useState,
 useEffect,
} from"react";

export type CurrencyCode ="USD" |"EUR" |"JPY" |"GBP";

export type CurrencyOption = {
 code: CurrencyCode;
 label: string;
 symbol: string;
 rate: number; // relative to USD
};

export const currencyOptions: CurrencyOption[] = [
 { code:"USD", label:"USD", symbol:"$", rate: 1 },
 { code:"EUR", label:"EUR", symbol:"€", rate: 0.92 },
 { code:"JPY", label:"JPY", symbol:"¥", rate: 155 },
 { code:"GBP", label:"GBP", symbol:"£", rate: 0.78 },
];

type CurrencyContextValue = {
 code: CurrencyCode;
 setCode: (c: CurrencyCode) => void;
 selected: CurrencyOption;
 options: CurrencyOption[];
 formatFiat: (amountUSD: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(
 undefined
);

function setCookie(name: string, value: string, days = 365) {
 if (typeof document ==="undefined") return;
 const expires = new Date(Date.now() + days * 864e5).toUTCString();
 document.cookie = `${name}=${encodeURIComponent(
 value
 )}; path=/; expires=${expires}; SameSite=Lax`;
}

export function CurrencyProvider({
 children,
 initialCode,
}: {
 children: React.ReactNode;
 initialCode?: CurrencyCode;
}) {
 const [code, setCode] = useState<CurrencyCode>(initialCode ??"USD");

 // Persist on change
 useEffect(() => {
 setCookie("currency", code, 365);
 }, [code]);

 const selected = useMemo(
 () => currencyOptions.find((c) => c.code === code) ?? currencyOptions[0],
 [code]
 );
 const formatFiat = (amountUSD: number) => {
 const converted = amountUSD * selected.rate;
 return `${selected.symbol}${converted.toLocaleString(undefined, {
 maximumFractionDigits: 0,
 })}`;
 };

 const value: CurrencyContextValue = {
 code,
 setCode,
 selected,
 options: currencyOptions,
 formatFiat,
 };

 return (
 <CurrencyContext.Provider value={value}>
 {children}
 </CurrencyContext.Provider>
 );
}

export function useCurrency() {
 const ctx = useContext(CurrencyContext);
 if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
 return ctx;
}
