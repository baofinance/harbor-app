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
                className="w-full flex items-center gap-2 px-3 py-2 bg-white/10 text-white enabled:hover:bg-[#FF8A7A]/20 text-md disabled:opacity-50 rounded-full"
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
                className={
                    "relative inline-flex items-center gap-4 px-3 py-1.5 text-sm text-white bg-white/10 hover:bg-[#FF8A7A]/20 rounded-full"
                }
            >
                <Wallet className="h-4 w-4 text-white/70"/>
                {displayAddr ? (
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
                }
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
            <div className="relative w-full max-w-md mt-28 bg-[#1E4775] flex flex-col overflow-hidden shadow-lg">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 text-white hover:bg-white/10 p-1.5"
                    aria-label="Close modal"
                >
                    ✕
                </button>

                <div className="px-6 py-4 bg-[#17395F]">
                    <h3 className="text-base font-semibold text-white">Wallets</h3>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <WalletOptions/>
                </div>
            </div>
        </div>
    )
})