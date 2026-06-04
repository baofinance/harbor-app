"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
 useAccount,
 useDisconnect,
 useBalance,
 useChainId,
 useChains,
 useSwitchChain,
} from "wagmi";
import { Copy, Check, LogOut, Wallet, AlertTriangle } from "lucide-react";
import { mainnet } from "wagmi/chains";
import DecryptedText from "./DecryptedText";
import { useHarborWalletConnectors } from "@/hooks/useHarborWalletConnectors";

function formatAddress(addr?: string) {
  if (!addr) return "";
 return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function WalletButton() {
 const { address, isConnected } = useAccount();
 const {
   visibleConnectors,
   connect,
   error,
   isPending,
   isError,
   reset,
   canConnect,
 } = useHarborWalletConnectors();
 const { disconnect } = useDisconnect();
 const chainId = useChainId();
 const configuredChains = useChains();
 const { data: balance } = useBalance({
 address,
 query: { enabled: !!address },
 });
 const { switchChain, isPending: isSwitching } = useSwitchChain();

 const [open, setOpen] = useState(false);
 const [copied, setCopied] = useState(false);
 const [isMounted, setIsMounted] = useState(false);

 useEffect(() => {
 setIsMounted(true);
 }, []);

 useEffect(() => {
   if (isConnected) {
     setOpen(false);
   }
 }, [isConnected]);

 /** Any chain configured in wagmi (e.g. mainnet + MegaETH) is valid for browsing the app. */
 const wrongNetwork =
   isConnected && !configuredChains.some((c) => c.id === chainId);
 const displayAddr = useMemo(
 () => (address ? formatAddress(address) :""),
 [address]
 );

 async function handleCopy() {
 if (!address) return;
 try {
 await navigator.clipboard.writeText(address);
 setCopied(true);
 setTimeout(() => setCopied(false), 1200);
 } catch {}
 }

 return (
 <>
 <button
 onClick={() => {
   reset();
   setOpen(true);
 }}
 className={
"relative inline-flex items-center gap-4 px-3 py-1.5 text-sm text-white bg-white/10 hover:bg-[#FF8A7A]/20 rounded-full" +
 (wrongNetwork ?"bg-red-500/20" :"")
 }
 >
 <Wallet className="h-4 w-4 text-white/70" />
 {isMounted ? (
 isConnected ? (
 <DecryptedText
 text={displayAddr}
 parentClassName="inline-block"
 className=""
 encryptedClassName="text-white/40"
 animateOn="view"
 useOriginalCharsOnly
 speed={60}
 />
 ) : (
 <span>Connect</span>
 )
 ) : (
 <span suppressHydrationWarning />
 )}
 {wrongNetwork && (
 <span className="absolute -top-1 -right-1 h-2.5 w-2.5-full bg-red-500" />
 )}
 </button>

 {open && (
 <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
 <div
 className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-100 transition-opacity"
 onClick={() => {
   reset();
   setOpen(false);
 }}
 />
 <div className="relative z-10 w-full max-w-sm bg-[#0c0d0d] text-white shadow-2xl">
 <div className="border-b border-white/10 p-4 flex items-center justify-between">
 <h3 className="font-semibold font-mono">
 {isConnected ?"Wallet" :"Connect Wallet"}
 </h3>
 <button
 onClick={() => {
   reset();
   setOpen(false);
 }}
 className="text-white/60 hover:text-white"
 aria-label="Close"
 >
 ×
 </button>
 </div>

 {isConnected ? (
 <div className="p-4 space-y-3">
 {wrongNetwork && (
 <div className="flex items-center justify-between bg-red-500/5 p-2">
 <div className="flex items-center gap-4 text-sm text-red-300">
 <AlertTriangle className="h-4 w-4" /> Wrong network
 </div>
 <button
 onClick={() => switchChain({ chainId: mainnet.id })}
 disabled={isSwitching}
 className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full"
 >
 {isSwitching ?"Switching..." :"Switch to Ethereum"}
 </button>
 </div>
 )}

 <div className="flex items-center justify-between">
 <div className="text-sm text-white/80">
 <div className="font-mono">
 {displayAddr ? (
 <DecryptedText
 text={displayAddr}
 parentClassName="inline-block"
 className=""
 encryptedClassName="text-white/40"
 animateOn="hover"
 />
 ) : (
 <span className="text-white/40">—</span>
 )}
 </div>
 <div className="text-white/60 text-xs">
 Chain ID {chainId}
 </div>
 </div>
 <button
 onClick={handleCopy}
 className="inline-flex items-center gap-4 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-full"
 >
 {copied ? (
 <>
 <Check className="h-3.5 w-3.5" /> Copied
 </>
 ) : (
 <>
 <Copy className="h-3.5 w-3.5" /> Copy
 </>
 )}
 </button>
 </div>

 <div className="bg-white/5 p-3">
 <div className="text-xs text-white/60">Balance</div>
 <div className="font-mono text-white">
 {balance
 ? `${Number(balance.value) / 10 ** balance.decimals} ${
 balance.symbol
 }`
 :"—"}
 </div>
 </div>

 <button
 onClick={() => {
 disconnect();
 setOpen(false);
 }}
 className="w-full inline-flex items-center justify-center gap-4 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-full"
 >
 <LogOut className="h-4 w-4" /> Disconnect
 </button>
 </div>
 ) : (
 <div className="p-3">
 {isError ? (
   <div className="mb-3 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
     {error?.message || "Could not connect wallet. Try again."}
   </div>
 ) : null}
 <div className="space-y-2">
                    {visibleConnectors.map((c) => {
                      const isReady = canConnect(c);
                      return (
 <button
 key={c.uid}
 type="button"
 onClick={() => {
                          reset();
                          connect(
                            { connector: c },
                            {
                              onSuccess: () => setOpen(false),
                            },
                          );
 }}
 disabled={isPending || !isReady}
 className="w-full flex items-center justify-between px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full"
 >
 <span className="text-left">{c.name}</span>
                          {isReady ? (
                            <span className="text-green-400 text-xs">
                              Ready
 </span>
                          ) : (
                            <span className="text-white/40 text-xs">
                              Unavailable
                            </span>
                          )}
 </button>
                      );
                    })}
 {visibleConnectors.length === 0 && (
 <div className="text-sm text-white/60 p-2 text-center">
                        No wallet connectors configured.
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </>
 );
}
