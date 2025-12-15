"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import SafeAppsSDK, { type SafeInfo } from "@safe-global/safe-apps-sdk";
import { SafeAppProvider } from "@safe-global/safe-apps-provider";
import { useAccount, useConnect } from "wagmi";

interface SafeAppContextValue {
  sdk: SafeAppsSDK | null;
  safe: SafeAppProvider | null;
  safeInfo: SafeInfo | null;
  isSafeApp: boolean;
}

export const SafeAppContext = React.createContext<SafeAppContextValue>({
  sdk: null,
  safe: null,
  safeInfo: null,
  isSafeApp: false,
});

// Initialize Safe SDK immediately (not in useEffect) so Safe can detect it
let safeSDKInstance: SafeAppsSDK | null = null;
let safeProviderInstance: SafeAppProvider | null = null;
let safeInfoInstance: SafeInfo | null = null;

if (typeof window !== "undefined") {
  // Check if we're in an iframe (Safe apps run in iframes)
  const isIframe = window.self !== window.top;
  
  if (isIframe) {
    try {
      // Initialize Safe SDK immediately
      safeSDKInstance = new SafeAppsSDK();
      
      // Store globally so Safe can detect it
      (window as any).__SAFE_SDK__ = safeSDKInstance;
      
      // Try to get Safe info (this will work if we're in Safe)
      safeSDKInstance.safe.getInfo()
        .then((info) => {
          safeInfoInstance = info;
          safeProviderInstance = new SafeAppProvider(info, safeSDKInstance!);
          
          // Store globally
          (window as any).__SAFE_APP_PROVIDER__ = safeProviderInstance;
          (window as any).__SAFE_INFO__ = info;
          (window as any).__SAFE_APP_DETECTED__ = true;
        })
        .catch((error) => {
          // Not in Safe environment
          console.log("Not running in Safe app:", error);
        });
    } catch (error) {
      console.error("Error initializing Safe SDK:", error);
    }
  }
}

export function SafeAppProviderWrapper({ children }: { children: ReactNode }) {
  const [sdk, setSdk] = useState<SafeAppsSDK | null>(safeSDKInstance);
  const [safe, setSafe] = useState<SafeAppProvider | null>(safeProviderInstance);
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(safeInfoInstance);
  const [isSafeApp, setIsSafeApp] = useState(!!safeInfoInstance);
  const [hasTriedConnect, setHasTriedConnect] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    // If SDK was initialized but we don't have info yet, try to get it
    if (safeSDKInstance && !safeInfoInstance) {
      safeSDKInstance.safe.getInfo()
        .then((info) => {
          safeInfoInstance = info;
          const provider = new SafeAppProvider(info, safeSDKInstance!);
          safeProviderInstance = provider;
          
          setSdk(safeSDKInstance);
          setSafe(provider);
          setSafeInfo(info);
          setIsSafeApp(true);

          // Store globally
          (window as any).__SAFE_APP_PROVIDER__ = provider;
          (window as any).__SAFE_INFO__ = info;
        })
        .catch((error) => {
          console.log("Failed to get Safe info:", error);
        });
    } else if (safeSDKInstance && safeInfoInstance) {
      // Already initialized, just set state
      setSdk(safeSDKInstance);
      setSafe(safeProviderInstance);
      setSafeInfo(safeInfoInstance);
      setIsSafeApp(true);
    }
  }, []);

  // Auto-connect when Safe is detected
  useEffect(() => {
    if (isSafeApp && !isConnected && !hasTriedConnect && connectors.length > 0) {
      // Find the injected connector (Safe injects an ethereum provider)
      const injectedConnector = connectors.find(
        (c) => c.type === "injected" || c.id === "injected"
      );
      
      if (injectedConnector) {
        setHasTriedConnect(true);
        // Small delay to ensure everything is ready
        setTimeout(() => {
          connect({ connector: injectedConnector }).catch((error) => {
            console.error("Failed to auto-connect Safe:", error);
          });
        }, 500);
      }
    }
  }, [isSafeApp, isConnected, hasTriedConnect, connectors, connect]);

  return (
    <SafeAppContext.Provider
      value={{
        sdk,
        safe,
        safeInfo,
        isSafeApp,
      }}
    >
      {children}
    </SafeAppContext.Provider>
  );
}

export function useSafeApp() {
  return React.useContext(SafeAppContext);
}

