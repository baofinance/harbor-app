"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import SafeAppsSDK, { type SafeInfo } from "@safe-global/safe-apps-sdk";
import { SafeAppProvider } from "@safe-global/safe-apps-provider";
import { useAccount, useConnect, useDisconnect } from "wagmi";

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
          
          // Set Safe provider as the primary ethereum provider
          // This ensures wagmi's injected connector uses Safe, not other wallets
          if (safeProviderInstance && typeof window !== "undefined") {
            // Override window.ethereum with Safe's provider to ensure it's used
            // This is necessary because if user has MetaMask, it might be prioritized
            (window as any).ethereum = {
              ...safeProviderInstance,
              isSafe: true,
              isMetaMask: false,
              isCoinbaseWallet: false,
              request: safeProviderInstance.request.bind(safeProviderInstance),
              // Add standard EIP-1193 methods
              send: safeProviderInstance.send?.bind(safeProviderInstance),
              sendAsync: safeProviderInstance.sendAsync?.bind(safeProviderInstance),
            };
          }
          
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
  const { disconnect } = useDisconnect();

  useEffect(() => {
    // If SDK was initialized but we don't have info yet, try to get it
    if (safeSDKInstance && !safeInfoInstance) {
      safeSDKInstance.safe.getInfo()
        .then((info) => {
          safeInfoInstance = info;
          const provider = new SafeAppProvider(info, safeSDKInstance!);
          safeProviderInstance = provider;
          
          // Set Safe provider as the primary ethereum provider
          if (provider && typeof window !== "undefined") {
            (window as any).ethereum = {
              ...provider,
              isSafe: true,
              isMetaMask: false,
              isCoinbaseWallet: false,
              request: provider.request.bind(provider),
              send: provider.send?.bind(provider),
              sendAsync: provider.sendAsync?.bind(provider),
            };
          }
          
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
    } else if (safeSDKInstance && safeInfoInstance && safeProviderInstance) {
      // Already initialized, just set state and ensure provider is set
      if (typeof window !== "undefined" && safeProviderInstance) {
        (window as any).ethereum = {
          ...safeProviderInstance,
          isSafe: true,
          isMetaMask: false,
          isCoinbaseWallet: false,
          request: safeProviderInstance.request.bind(safeProviderInstance),
          send: safeProviderInstance.send?.bind(safeProviderInstance),
          sendAsync: safeProviderInstance.sendAsync?.bind(safeProviderInstance),
        };
      }
      
      setSdk(safeSDKInstance);
      setSafe(safeProviderInstance);
      setSafeInfo(safeInfoInstance);
      setIsSafeApp(true);
    }
  }, []);

  // Check if we're connected to the wrong address (not Safe)
  useEffect(() => {
    if (isSafeApp && safeInfo && isConnected && address) {
      const safeAddress = safeInfo.safeAddress.toLowerCase();
      const connectedAddress = address.toLowerCase();
      
      if (connectedAddress !== safeAddress) {
        console.log("Connected to wrong address, disconnecting and reconnecting to Safe...", {
          connected: connectedAddress,
          expected: safeAddress,
        });
        disconnect();
        setHasTriedConnect(false);
      }
    }
  }, [isSafeApp, safeInfo, isConnected, address, disconnect]);

  // Auto-connect when Safe is detected
  useEffect(() => {
    if (isSafeApp && safeInfo && !isConnected && !hasTriedConnect) {
      // Wait a bit for connectors to be ready and provider to be set
      const tryConnect = async () => {
        if (connectors.length === 0) {
          // Retry if connectors aren't ready yet
          setTimeout(tryConnect, 200);
          return;
        }

        // Find the injected connector (Safe injects an ethereum provider)
        const injectedConnector = connectors.find(
          (c) => c.type === "injected" || c.id === "injected" || c.name.toLowerCase().includes("injected")
        );
        
        if (injectedConnector) {
          setHasTriedConnect(true);
          console.log("Attempting to auto-connect Safe wallet...", {
            safeAddress: safeInfo.safeAddress,
            connector: injectedConnector.name,
          });
          
          try {
            // In wagmi v2, connect might not return a promise, so we handle it safely
            const result = connect({ connector: injectedConnector });
            if (result && typeof result.then === 'function') {
              await result;
              console.log("Successfully connected to Safe wallet");
            } else {
              // If it doesn't return a promise, assume it's synchronous
              console.log("Connect called (may be synchronous)");
            }
          } catch (error) {
            console.error("Failed to auto-connect Safe:", error);
            // Reset to allow retry
            setHasTriedConnect(false);
          }
        } else {
          console.warn("No injected connector found for Safe");
          // Retry after a delay
          setTimeout(() => {
            setHasTriedConnect(false);
          }, 1000);
        }
      };

      // Initial delay to ensure everything is set up, especially window.ethereum
      setTimeout(tryConnect, 500);
    }
  }, [isSafeApp, safeInfo, isConnected, hasTriedConnect, connectors, connect]);

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

