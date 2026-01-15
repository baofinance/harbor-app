'use client'

import {useAccount, useBalance, useDisconnect, useSwitchChain} from 'wagmi'
import {useMemo, useState} from "react";
import NetworkIconClient from "@/components/NetworkIconClient";
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
                    <div className="relative w-full max-w-md mt-36 bg-[#1E4775] flex flex-col overflow-hidden shadow-lg">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="absolute top-3 right-3 text-white bg-transparent hover:bg-[#153A5F] hover:text-gray-900 text-sm p-1.5 inline-flex items-center"
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

                        <div className="px-6 py-4 bg-[#153A5F]">
                            <h3 className="text-base font-semibold text-white lg:text-xl ">
                                Wallet
                            </h3>
                        </div>

                        <div className="p-6 overflow-y-auto flex flex-col gap-2 flex-1">

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
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-4 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-full"
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
                            <div className="bg-white/5 p-3">
                                <div className="text-xs text-white/60">Balance</div>
                                <div className="font-mono text-white">
                                    {balance
                                        ? `${Number(balance.value) / 10 ** balance.decimals} ${
                                            balance.symbol
                                        }`
                                        : "—"}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-[#153A5F]">
                            <h3 className="text-base font-semibold text-white lg:text-xl">
                                Networks
                            </h3>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <NetworkOptions/>
                        </div>

                        <div className="px-6 py-4 flex items-center justify-center ">
                            <button
                                onClick={() => disconnect()}
                                className="w-full bg-[#153A5F] inline-flex items-center justify-center gap-4 px-3 py-2 hover:bg-white/20 rounded-full"
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

            {chains.map((network) => (
                <li key={network.id}>
                    <button
                        disabled={!switchChain || network.id === chain?.id}
                        onClick={() => switchChain({chainId: network.id})}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-white/10 text-white enabled:hover:bg-[#FF8A7A]/20 text-md disabled:opacity-50 rounded-full"
                    >
                        <NetworkIcon name={network.name}/>
                        {network.name}
                        {status === 'pending' && ' (switching)'}
                    </button>
                </li>
            ))}
        </ul>

    );
}

function NetworkIcon({name}: { name: string }) {
    const resolvedName = name === 'Anvil' ? 'Ethereum' : name;

    return (
        <div className="bg-white-xs rounded-xs">
            <NetworkIconClient name={resolvedName} size={24} variant="branded"/>
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
                className="relative inline-flex items-center gap-4 px-3 py-1.5 text-sm text-white bg-white/10 hover:bg-[#FF8A7A]/20 rounded-full"
            >
                <Wallet className="h-4 w-4 text-white/70" />
                <div className="flex items-center space-x-2">
                    {chain && <NetworkIcon name={chain.name} />}
                    <DecryptedText
                        text={displayAddr}
                        parentClassName="inline-block"
                        encryptedClassName="text-white/40"
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
