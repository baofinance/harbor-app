"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppBackgroundMode = "eth" | "megaeth" | "robinhood";

type AppBackgroundContextValue = {
  mode: AppBackgroundMode;
  setMode: (mode: AppBackgroundMode) => void;
};

const STORAGE_KEY = "appBackgroundMode";
const AppBackgroundContext = createContext<AppBackgroundContextValue | null>(null);

function bodyClassForMode(mode: AppBackgroundMode): string {
  if (mode === "megaeth") return "app-bg-megaeth";
  if (mode === "robinhood") return "app-bg-robinhood";
  return "app-bg-eth";
}

function applyBodyBackgroundClass(mode: AppBackgroundMode) {
  if (typeof document === "undefined") return;
  document.body.classList.remove("app-bg-eth", "app-bg-megaeth", "app-bg-robinhood");
  document.body.classList.add(bodyClassForMode(mode));
}

export function AppBackgroundProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppBackgroundMode>("eth");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextMode: AppBackgroundMode =
      stored === "megaeth" || stored === "robinhood" ? stored : "eth";
    setModeState(nextMode);
    applyBodyBackgroundClass(nextMode);
  }, []);

  useEffect(() => {
    applyBodyBackgroundClass(mode);
  }, [mode]);

  const setMode = useCallback((nextMode: AppBackgroundMode) => {
    setModeState(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <AppBackgroundContext.Provider value={value}>
      {children}
    </AppBackgroundContext.Provider>
  );
}

export function useAppBackground(): AppBackgroundContextValue {
  const ctx = useContext(AppBackgroundContext);
  if (!ctx) {
    throw new Error("useAppBackground must be used within AppBackgroundProvider");
  }
  return ctx;
}

