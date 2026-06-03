"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isAddress } from "viem";
import { IMPERSONATION_ENABLED } from "@/config/impersonation";

const STORAGE_KEY = "harbor.impersonateAddress";

type ImpersonationContextValue = {
  impersonatedAddress: `0x${string}` | null;
  isImpersonating: boolean;
  setImpersonatedAddress: (address: `0x${string}` | null) => void;
  clearImpersonation: () => void;
  recentAddresses: `0x${string}`[];
};

const ImpersonationContext = createContext<ImpersonationContextValue | null>(
  null
);

function readStoredAddress(): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw && isAddress(raw)) return raw as `0x${string}`;
  } catch {
    /* ignore */
  }
  return null;
}

function readRecentAddresses(): `0x${string}`[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}.recent`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is `0x${string}` => typeof a === "string" && isAddress(a)
    );
  } catch {
    return [];
  }
}

function persistRecent(address: `0x${string}`) {
  const recent = readRecentAddresses().filter(
    (a) => a.toLowerCase() !== address.toLowerCase()
  );
  recent.unshift(address);
  sessionStorage.setItem(
    `${STORAGE_KEY}.recent`,
    JSON.stringify(recent.slice(0, 8))
  );
}

export function ImpersonationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [impersonatedAddress, setImpersonatedAddressState] = useState<
    `0x${string}` | null
  >(null);
  const [recentAddresses, setRecentAddresses] = useState<`0x${string}`[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!IMPERSONATION_ENABLED) {
      setHydrated(true);
      return;
    }
    setImpersonatedAddressState(readStoredAddress());
    setRecentAddresses(readRecentAddresses());
    setHydrated(true);
  }, []);

  const setImpersonatedAddress = useCallback(
    (address: `0x${string}` | null) => {
      if (!IMPERSONATION_ENABLED) return;
      setImpersonatedAddressState(address);
      try {
        if (address) {
          sessionStorage.setItem(STORAGE_KEY, address);
          persistRecent(address);
          setRecentAddresses(readRecentAddresses());
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        /* ignore */
      }
    },
    []
  );

  const clearImpersonation = useCallback(() => {
    setImpersonatedAddress(null);
  }, [setImpersonatedAddress]);

  const value = useMemo(
    () => ({
      impersonatedAddress:
        IMPERSONATION_ENABLED && hydrated ? impersonatedAddress : null,
      isImpersonating:
        IMPERSONATION_ENABLED &&
        hydrated &&
        impersonatedAddress !== null,
      setImpersonatedAddress,
      clearImpersonation,
      recentAddresses: hydrated ? recentAddresses : [],
    }),
    [
      hydrated,
      impersonatedAddress,
      setImpersonatedAddress,
      clearImpersonation,
      recentAddresses,
    ]
  );

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) {
    throw new Error("useImpersonation must be used within ImpersonationProvider");
  }
  return ctx;
}
