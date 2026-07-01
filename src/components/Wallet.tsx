'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import type { Connector } from 'wagmi'
import { useAccount } from 'wagmi'
import { Account } from '@/components/Account'
import { useEffect, useMemo, useState } from 'react'
import WalletIconClient from '@/components/WalletIconClient'
import { Wallet } from "lucide-react";
import DecryptedText from "@/components/DecryptedText";
import {
  HARBOR_NAV_WALLET_CHIP_CLASS,
  HARBOR_NAV_WALLET_INSET_PANEL_CLASS,
  HARBOR_NAV_WALLET_MODAL_HEADER_CLASS,
  HARBOR_NAV_WALLET_MODAL_OVERLAY_CLASS,
  HARBOR_NAV_WALLET_MODAL_SHELL_CLASS,
  HARBOR_NAV_WALLET_OPTION_CLASS,
} from '@/components/shared/harborNavStyles'
import { useHarborWalletConnectors } from '@/hooks/useHarborWalletConnectors'

function formatAddress(addr?: string) {
    if (!addr) return "";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function WalletOptions({ onConnected }: { onConnected?: () => void }) {
    const {
        visibleConnectors,
        connect,
        error,
        isPending,
        isError,
        reset,
        canConnect,
    } = useHarborWalletConnectors()

    return (
        <div className="space-y-3">
            {isError ? (
                <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error?.message || "Could not connect wallet. Try again."}
                </div>
            ) : null}
            <ul className="space-y-1">
                {visibleConnectors.map((connector) => (
                    <li key={connector.uid}>
                        <WalletOption
                            connector={connector}
                            disabled={isPending || !canConnect(connector)}
                            onClick={() => {
                                reset()
                                connect(
                                    { connector },
                                    {
                                        onSuccess: () => onConnected?.(),
                                    },
                                )
                            }}
                        />
                    </li>
                ))}
            </ul>
            {visibleConnectors.length === 0 ? (
                <p className="text-sm text-white/60">
                    No wallet connectors available. Install a browser wallet or configure WalletConnect.
                </p>
            ) : null}
        </div>
    )
}

function WalletOption({
    connector,
    disabled,
    onClick,
}: {
    connector: Connector
    disabled: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={HARBOR_NAV_WALLET_OPTION_CLASS}
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
    const { address, isConnected } = useAccount()
    const { reset } = useHarborWalletConnectors()

    const displayAddr = useMemo(
        () => (address ? formatAddress(address) : ""),
        [address]
    );

    useEffect(() => {
        if (isConnected) {
            setShowModal(false)
        }
    }, [isConnected])

    return (
        <>

            <button
                onClick={() => {
                    reset()
                    setShowModal(true)
                }}
                className={HARBOR_NAV_WALLET_CHIP_CLASS}
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

            {showModal ? (
                <WalletModal
                    onClose={() => {
                        reset()
                        setShowModal(false)
                    }}
                    onConnected={() => setShowModal(false)}
                />
            ) : null}

        </>
    )
}

const WalletModal = React.memo(function WalletModal({
    onClose,
    onConnected,
}: {
    onClose: () => void
    onConnected: () => void
}) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return createPortal(
        <div className={HARBOR_NAV_WALLET_MODAL_OVERLAY_CLASS}>
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className={`relative mt-28 flex w-full max-w-md flex-col overflow-hidden rounded-lg ${HARBOR_NAV_WALLET_MODAL_SHELL_CLASS}`}>
                <button
                    type="button"
                    onClick={onClose}
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
                        />
                    </svg>
                    <span className="sr-only">Close modal</span>
                </button>

                <div className={HARBOR_NAV_WALLET_MODAL_HEADER_CLASS}>
                    <h3 className="text-base font-semibold text-[#1E4775] lg:text-xl">Wallets</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <WalletOptions onConnected={onConnected} />
                </div>
            </div>
        </div>,
        document.body,
    )
})
