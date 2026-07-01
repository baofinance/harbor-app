'use client'

import {useAccount, useBalance, useDisconnect, useSwitchChain} from 'wagmi'
import {useMemo, useState} from "react";
import NetworkIconClient from "@/components/NetworkIconClient";
import { getWeb3iconsNetworkId } from "@/config/web3iconsNetworks";
import {
  HARBOR_NAV_NETWORK_ACTIVE_CLASS,
  HARBOR_NAV_NETWORK_IDLE_CLASS,
  HARBOR_NAV_WALLET_ACTION_CLASS,
  HARBOR_NAV_WALLET_CHIP_CLASS,
  HARBOR_NAV_WALLET_INSET_PANEL_CLASS,
  HARBOR_NAV_WALLET_MODAL_HEADER_CLASS,
  HARBOR_NAV_WALLET_MODAL_SHELL_CLASS,
} from "@/components/shared/harborNavStyles";
import * as React from "react";
import DecryptedText from "@/components/DecryptedText";
import {Check, Copy, LogOut, Wallet} from "lucide-react";

function AccountModal({showModal, setShowModal}: { showModal: boolean, setShowModal: (show: boolean) => void }) {
    const [copied, setCopied] = useState(false);
    const {disconnect} = useDisconnect()
    const {error} = useSwitchChain()

    const { address  } = useAccount()

    const {data: balance} = useBalance({
        address,
        query: {enabled: !!address},
    });

    const displayAddr = useMemo(
        () => (address ? formatAddress(address) : ""),
        [address]
    )

    async function handleCopy() {
        if (!address) return;
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
        }
    }

    return (
        <>
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-36">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    />
                    <div className={`relative mt-36 flex w-full max-w-md flex-col overflow-hidden rounded-lg ${HARBOR_NAV_WALLET_MODAL_SHELL_CLASS}`}>
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="absolute top-3 right-3 z-10 inline-flex items-center rounded-md p-1.5 text-[#1E4775]/60 transition hover:bg-[#1E4775]/5 hover:text-[#1E4775]"
                        >
                            <svg
                                aria-hidden="true"
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                ></path>
                            </svg>
                            <span className="sr-only">Close modal</span>
                        </button>

                        <div className={HARBOR_NAV_WALLET_MODAL_HEADER_CLASS}>
                            <h3 className="text-base font-semibold text-[#1E4775] lg:text-xl">
                                Wallet
                            </h3>
                        </div>

                        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-6">

                            <div className="flex items-center justify-between">
                                <div className="text-sm text-[#1E4775]/85">
                                    <div className="font-mono">
                                        {displayAddr ? (
                                            <DecryptedText
                                                text={displayAddr}
                                                parentClassName="inline-block"
                                                className=""
                                                encryptedClassName="text-[#1E4775]/40"
                                                animateOn="hover"
                                            />
                                        ) : (
                                            <span className="text-[#1E4775]/40">—</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className={`inline-flex items-center gap-2 px-2 py-1 text-xs ${HARBOR_NAV_WALLET_ACTION_CLASS}`}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-3.5 w-3.5"/> Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5"/> Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className={HARBOR_NAV_WALLET_INSET_PANEL_CLASS}>
                                <div className="text-xs text-[#1E4775]/60">Balance</div>
                                <div className="font-mono text-[#1E4775]">
                                    {balance
                                        ? `${Number(balance.value) / 10 ** balance.decimals} ${
                                            balance.symbol
                                        }`
                                        : "—"}
                                </div>
                            </div>
                        </div>

                        <div className={HARBOR_NAV_WALLET_MODAL_HEADER_CLASS}>
                            <h3 className="text-base font-semibold text-[#1E4775] lg:text-xl">
                                Networks
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <NetworkOptions/>
                        </div>

                        <div className="flex items-center justify-center px-6 py-4">
                            <button
                                type="button"
                                onClick={() => disconnect()}
                                className={`inline-flex w-full items-center justify-center gap-2 ${HARBOR_NAV_WALLET_ACTION_CLASS}`}
                            >
                                <LogOut className="h-4 w-4" /> Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div>{error && error.message}</div>
        </>
    );
}

function NetworkOptions() {
    const {chain} = useAccount()
    const {chains, switchChain, status} = useSwitchChain()

    return (
        <ul className="space-y-1">
            {chains.map((network) => {
                const isCurrent = network.id === chain?.id
                const canUseSwitch = Boolean(switchChain)
                return (
                    <li key={network.id}>
                        <button
                            type="button"
                            disabled={!canUseSwitch}
                            aria-current={isCurrent ? "true" : undefined}
                            aria-disabled={isCurrent || !canUseSwitch}
                            onClick={() => {
                                if (!switchChain || isCurrent) return
                                switchChain({chainId: network.id})
                            }}
                            className={
                                isCurrent
                                    ? HARBOR_NAV_NETWORK_ACTIVE_CLASS
                                    : `${HARBOR_NAV_NETWORK_IDLE_CLASS} ${!canUseSwitch ? "cursor-not-allowed opacity-50" : ""}`
                            }
                        >
                            <NetworkIcon name={network.name} />
                            {network.name}
                            {status === "pending" && " (switching)"}
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}

function NetworkIcon({name}: { name: string }) {
    const resolvedName = name === "Anvil" ? "Ethereum" : name;
    // web3icons expects kebab-case ids (e.g. "mega-eth" for MegaETH)
    const iconName = getWeb3iconsNetworkId(resolvedName) || resolvedName;

    return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <NetworkIconClient name={iconName} size={24} variant="branded" />
        </div>
    );
}

function formatAddress(addr?: string) {
    if (!addr) return "";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function Account() {
    const { address, chain } = useAccount()
    const [showModal, setShowModal] = useState(false)

    const displayAddr = useMemo(
        () => (address ? formatAddress(address) : ""),
        [address]
    )

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className={`relative inline-flex items-center ${HARBOR_NAV_WALLET_CHIP_CLASS}`}
            >
                <Wallet className="h-4 w-4 shrink-0 text-[#1E4775]/80" />
                <div className="flex items-center gap-2">
                    {chain && <NetworkIcon name={chain.name} />}
                    <DecryptedText
                        text={displayAddr}
                        parentClassName="inline-block text-[#1E4775]"
                        className="text-[#1E4775]"
                        encryptedClassName="text-[#1E4775]/40"
                        animateOn="view"
                        useOriginalCharsOnly
                        speed={60}
                    />
                </div>
            </button>

            <AccountModal showModal={showModal} setShowModal={setShowModal} />
        </>
    )
}
