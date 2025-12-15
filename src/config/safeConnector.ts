import { createConnector } from "wagmi";
import SafeAppsSDK from "@safe-global/safe-apps-sdk";
import { SafeAppProvider } from "@safe-global/safe-apps-provider";

// Check if we're in a Safe iframe
function isSafeContext(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // If we can't access window.top due to cross-origin, we're likely in an iframe
  }
}

// Custom Safe connector for wagmi v2
export function safeConnector() {
  let sdk: SafeAppsSDK | null = null;
  let provider: SafeAppProvider | null = null;
  let safeInfo: { safeAddress: string; chainId: number } | null = null;

  return createConnector((config) => ({
    id: "safe",
    name: "Safe",
    type: "safe",

    async setup() {
      // Only setup if we're in a Safe iframe
      if (!isSafeContext()) return;

      try {
        sdk = new SafeAppsSDK();
        const info = await sdk.safe.getInfo();
        safeInfo = {
          safeAddress: info.safeAddress,
          chainId: info.chainId,
        };
        provider = new SafeAppProvider(info, sdk);
        
        // Store globally for debugging
        if (typeof window !== "undefined") {
          (window as any).__SAFE_SDK__ = sdk;
          (window as any).__SAFE_INFO__ = info;
          (window as any).__SAFE_APP_PROVIDER__ = provider;
        }
      } catch (error) {
        // Not in a Safe context
        console.log("Safe connector setup: not in Safe context");
      }
    },

    async connect() {
      // Initialize if not already done
      if (!sdk || !provider || !safeInfo) {
        await this.setup();
      }

      if (!provider || !safeInfo) {
        throw new Error("Safe provider not available");
      }

      // Get accounts from Safe
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      const chainId = safeInfo.chainId;

      console.log("Safe connector: connected", { accounts, chainId });

      return {
        accounts: accounts as `0x${string}`[],
        chainId,
      };
    },

    async disconnect() {
      // Safe doesn't really disconnect, but we can clean up
      console.log("Safe connector: disconnect called");
    },

    async getAccounts() {
      if (!provider) {
        return [];
      }
      
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      return accounts as `0x${string}`[];
    },

    async getChainId() {
      if (!safeInfo) {
        return config.chains[0].id;
      }
      return safeInfo.chainId;
    },

    async getProvider() {
      if (!provider) {
        await this.setup();
      }
      return provider;
    },

    async isAuthorized() {
      // If we're in Safe and have provider, we're authorized
      if (!isSafeContext()) return false;
      if (!provider) {
        try {
          await this.setup();
        } catch {
          return false;
        }
      }
      return !!provider && !!safeInfo;
    },

    onAccountsChanged(accounts) {
      // Safe accounts don't change
    },

    onChainChanged(chainId) {
      config.emitter.emit("change", { chainId: Number(chainId) });
    },

    onDisconnect() {
      config.emitter.emit("disconnect");
    },
  }));
}

