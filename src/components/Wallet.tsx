'use client'

import * as React from 'react'
import {Connector, useConnect, useAccount} from 'wagmi'
import {Account} from '@/components/Account'
import {useEffect, useMemo, useState} from 'react'
import WalletIconClient from '@/components/WalletIconClient'
import {Wallet} from "lucide-react";
import DecryptedText from "@/components/DecryptedText";

function formatAddress(addr?: string) {
    if (!addr) return "";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function WalletOptions() {
    const {connectors, connect} = useConnect()
    const [ready, setReady] = useState<Set<string>>(new Set())

    useEffect(() => {
        let mounted = true

        Promise.allSettled(
            connectors.map(async (c) => {
                const provider = await c.getProvider()
                return provider ? c.uid : null
            })
        ).then((results) => {
            if (!mounted) return

            setReady(
                new Set(
                    results
                        .filter(
                            (r): r is PromiseFulfilledResult<string | null> =>
                                r.status === 'fulfilled'
                        )
                        .map((r) => r.value)
                        .filter((uid): uid is string => uid !== null)
                )
            )
        })

        return () => {
            mounted = false
        }
    }, [connectors])

    return (
        <ul className="space-y-1">
            {connectors.map((connector) => (
                <li key={connector.uid}>
                    <WalletOption
                        connector={connector}
                        ready={ready.has(connector.uid)}
                        onClick={() => connect({connector})}
                    />
                </li>
            ))}
        </ul>
    )
}

function WalletOption({connector, onClick}: { connector: Connector; onClick: () => void }) {
    const [ready, setReady] = React.useState(false)

    React.useEffect(() => {
        connector.getProvider().then((provider) => setReady(!!provider))
    }, [connector])

    return (
        <button disabled={!ready} onClick={onClick}
                className="w-full flex items-center gap-2 px-3 py-2 bg-white/10 text-white enabled:hover:bg-[#FF8A7A]/20 text-md disabled:opacity-50 rounded-md"
        >
            <WalletIcon name={connector.name}/> {connector.name}
        </button>
    )
}

export function ConnectWallet() {
    const {isConnected} = useAccount()

    return isConnected ? <Account/> : <ConnectButton/>
}


function WalletIcon({name}: { name: string }) {
    return (
        <div className="wallet-icon rounded-xs">
            <div className="wallet-placeholder h-5 w-5 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-white/60" />
            </div>
            <WalletIconClient name={name} size={20} variant="branded" />
        </div>
    );
};

function ConnectButton() {
    const [showModal, setShowModal] = useState(false)
    const {address} = useAccount()

    const displayAddr = useMemo(
        () => (address ? formatAddress(address) : ""),
        [address]
    );

    return (
        <>

            <button
                onClick={() => setShowModal(true)}
                className="relative inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 text-sm font-medium text-[#1E4775] bg-white shadow-sm hover:bg-white/90 rounded-md"
            >
                <Wallet className="h-4 w-4 shrink-0 text-[#1E4775]/80" />
                {displayAddr ? (
                    <DecryptedText
                        text={displayAddr}
                        parentClassName="inline-block text-[#1E4775]"
                        className="text-[#1E4775]"
                        encryptedClassName="text-[#1E4775]/40"
                        animateOn="view"
                        useOriginalCharsOnly
                        speed={60}
                    />
                ) : (
                    <span>Connect</span>
                )}
            </button>

            {showModal && <WalletModal onClose={() => setShowModal(false)}/>}

        </>
    )
}

const WalletModal = React.memo(function WalletModal({
                                                        onClose,
                                                    }: {
    onClose: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-28">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md mt-28 bg-[#1E4775] flex flex-col overflow-hidden rounded-lg shadow-lg">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 text-white bg-transparent hover:bg-[#153A5F] hover:text-gray-900 text-sm p-1.5 inline-flex items-center z-10"
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
                        />
                    </svg>
                    <span className="sr-only">Close modal</span>
                </button>

                <div className="px-6 py-4 bg-[#153A5F]">
                    <h3 className="text-base font-semibold text-white lg:text-xl">Wallets</h3>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <WalletOptions/>
                </div>
            </div>
        </div>
    )
})