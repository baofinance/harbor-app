"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface SafeAppContextValue {
  safeAddress: string | null;
  chainId: number | null;
  isSafeApp: boolean;
  isLoading: boolean;
}

export const SafeAppContext = React.createContext<SafeAppContextValue>({
  safeAddress: null,
  chainId: null,
  isSafeApp: false,
  isLoading: true,
});

export function SafeAppProviderWrapper({ children }: { children: ReactNode }) {
  const [isSafeApp, setIsSafeApp] = useState(false);
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTriedConnect, setHasTriedConnect] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Check if we're in a Safe iframe
  useEffect(() => {
    const checkSafe = async () => {
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      // Check if we're in an iframe
      let isIframe = false;
      try {
        isIframe = window.self !== window.top;
      } catch {
        isIframe = true; // Cross-origin iframe
      }

      if (!isIframe) {
        setIsLoading(false);
        return;
      }

      // Try to detect Safe by checking for the Safe connector response
      // The Safe connector will have set up the provider
      const safeInfo = (window as any).__SAFE_INFO__;
      if (safeInfo) {
        setIsSafeApp(true);
        setSafeAddress(safeInfo.safeAddress);
        setChainId(safeInfo.chainId);
        console.log("Safe App detected:", safeInfo);
      } else {
        // Wait a bit for Safe connector to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        const delayedInfo = (window as any).__SAFE_INFO__;
        if (delayedInfo) {
          setIsSafeApp(true);
          setSafeAddress(delayedInfo.safeAddress);
          setChainId(delayedInfo.chainId);
          console.log("Safe App detected (delayed):", delayedInfo);
        }
      }
      setIsLoading(false);
    };

    checkSafe();
  }, []);

  // Auto-connect when Safe is detected
  useEffect(() => {
    if (isSafeApp && !isConnected && !hasTriedConnect && !isLoading) {
      const safeConnector = connectors.find(
        (c) => c.id === "safe" || c.type === "safe"
      );

      if (safeConnector) {
        setHasTriedConnect(true);
        console.log("Auto-connecting with Safe connector...");
        
        // Use connect which triggers the connector
        connect({ connector: safeConnector });
      } else {
        console.warn("Safe connector not found in connectors:", 
          connectors.map(c => ({ id: c.id, type: c.type, name: c.name }))
        );
      }
    }
  }, [isSafeApp, isConnected, hasTriedConnect, isLoading, connectors, connect]);

  // If connected to wrong address in Safe, disconnect and reconnect
  useEffect(() => {
    if (isSafeApp && safeAddress && isConnected && address) {
      const connectedAddr = address.toLowerCase();
      const expectedAddr = safeAddress.toLowerCase();
      
      if (connectedAddr !== expectedAddr) {
        console.log("Connected to wrong address, reconnecting to Safe...", {
          connected: connectedAddr,
          expected: expectedAddr,
        });
        disconnect();
        setHasTriedConnect(false);
      }
    }
  }, [isSafeApp, safeAddress, isConnected, address, disconnect]);

  return (
    <SafeAppContext.Provider
      value={{
        safeAddress,
        chainId,
        isSafeApp,
        isLoading,
      }}
    >
      {children}
    </SafeAppContext.Provider>
  );
}

export function useSafeApp() {
  return React.useContext(SafeAppContext);
}
