"use client";

import { useEffect, useMemo, useState } from "react";
import type { Connector } from "wagmi";
import { useConnect } from "wagmi";
import { useSafeApp } from "@/components/SafeAppProvider";

function isWalletConnectConnector(connector: Connector): boolean {
  return connector.id === "walletConnect" || connector.type === "walletConnect";
}

function isSafeConnector(connector: Connector): boolean {
  return connector.id === "safe" || connector.type === "safe";
}

export function useHarborWalletConnectors() {
  const { connectors, connect, error, isPending, isError, reset, status } =
    useConnect();
  const { isSafeApp } = useSafeApp();
  const [readyUids, setReadyUids] = useState<Set<string>>(new Set());

  const visibleConnectors = useMemo(
    () =>
      connectors.filter((connector) => {
        if (isSafeConnector(connector)) return isSafeApp;
        return true;
      }),
    [connectors, isSafeApp],
  );

  useEffect(() => {
    let mounted = true;

    void Promise.allSettled(
      visibleConnectors.map(async (connector) => {
        if (isWalletConnectConnector(connector)) {
          return connector.uid;
        }
        try {
          const provider = await connector.getProvider();
          return provider ? connector.uid : null;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (!mounted) return;
      setReadyUids(
        new Set(
          results
            .map((result) =>
              result.status === "fulfilled" ? result.value : null,
            )
            .filter((uid): uid is string => uid != null),
        ),
      );
    });

    return () => {
      mounted = false;
    };
  }, [visibleConnectors]);

  const canConnect = (connector: Connector) => {
    if (isWalletConnectConnector(connector)) return true;
    return readyUids.has(connector.uid);
  };

  return {
    visibleConnectors,
    connect,
    error,
    isPending,
    isError,
    reset,
    status,
    canConnect,
    readyUids,
  };
}
