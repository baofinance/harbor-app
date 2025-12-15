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

export function SafeAppProviderWrapper({ children }: { children: ReactNode }) {
  const [sdk, setSdk] = useState<SafeAppsSDK | null>(null);
  const [safe, setSafe] = useState<SafeAppProvider | null>(null);
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const [isSafeApp, setIsSafeApp] = useState(false);
  const [hasTriedConnect, setHasTriedConnect] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    // Check if we're running inside a Safe app
    const checkSafeApp = async () => {
      try {
        // Check if we're in an iframe (Safe apps run in iframes)
        const isIframe = window.self !== window.top;
        
        if (isIframe) {
          // Initialize Safe SDK
          const safeSdk = new SafeAppsSDK();
          
          // Try to get Safe info to confirm we're in a Safe environment
          try {
            const info = await safeSdk.safe.getInfo();
            const safeProvider = new SafeAppProvider(info, safeSdk);
            
            setSdk(safeSdk);
            setSafe(safeProvider);
            setSafeInfo(info);
            setIsSafeApp(true);

            // Store Safe provider globally for potential use
            (window as any).__SAFE_APP_PROVIDER__ = safeProvider;
            (window as any).__SAFE_INFO__ = info;

            console.log("Safe app detected:", {
              safeAddress: info.safeAddress,
              chainId: info.chainId,
              owners: info.owners,
            });
          } catch (error) {
            // Not in Safe environment or Safe SDK failed
            console.log("Not running in Safe app:", error);
            setIsSafeApp(false);
          }
        } else {
          setIsSafeApp(false);
        }
      } catch (error) {
        console.error("Error checking Safe app:", error);
        setIsSafeApp(false);
      }
    };

    checkSafeApp();
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

