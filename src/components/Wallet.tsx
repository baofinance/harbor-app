'use client'

import * as React from'react'
import { Connector, useConnect, useAccount } from'wagmi'
import { Account } from'@/components/Account'
import { useEffect, useState } from'react'
import { Geo } from'next/font/google'
import WalletIconClient from'@/components/WalletIconClient'

const geo = Geo({
 subsets: ['latin'],
 weight:'400',
 display:'swap',
})

function WalletOptions() {
 const { connectors, connect } = useConnect()

 return (
 <ul className="space-y-1">
 {connectors.map((connector) => (
 <li key={connector.id}>
 <WalletOption connector={connector} onClick={() => connect({ connector })} />
 </li>
 ))}
 </ul>
 )
}

function WalletOption({ connector, onClick }: { connector: Connector; onClick: () => void }) {
 const [ready, setReady] = React.useState(false)

 React.useEffect(() => {
 connector.getProvider().then((provider) => setReady(!!provider))
 }, [connector])

 return (
 <button disabled={!ready} onClick={onClick} className="flex items-center gap-4 text-white hover:text-black text-lg">
 <WalletIcon name={connector.name} /> {connector.name}
 </button>
 )
}

export function ConnectWallet() {
 const { isConnected } = useAccount()
 const [hasMounted, setHasMounted] = useState(false)

 useEffect(() => {
 setHasMounted(true)
 }, [])

 if (!hasMounted) return null

 return isConnected ? <Account /> : <ConnectButton />
}


function WalletIcon({ name }: { name: string }) {
 const variant ='branded';

 if (name ==='Injected') return <div className="w-6 h-6" />;

 return (
 <div className="bg-white-xs">
 <WalletIconClient name={name} size={24} variant={variant} />
 </div>
 );
};

function ConnectButton() {
 const [showModal, setShowModal] = useState(false)
 const { address, isConnected } = useAccount()

 const formatAddress = (addr: string) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` :'')

 return (
 <>
 <button
 onClick={() => setShowModal(true)}
 className={`bg-[#FF8A7A] hover:bg-[#FF6B5A] px-6 py-2 text-white text-lg tracking-wider transition-all uppercase rounded-full ${geo.className}`}
 >
 {isConnected ? formatAddress(address!) : <div className="font-semibold">Connect Wallet</div>}
 </button>

 {showModal && (
 <div className={`fixed inset-0 z-50 flex items-center justify-end px-4 pt-28 ${geo.className}`}>
 <div className="relative w-full max-w-md mt-28 bg-[#1E4775] flex flex-col overflow-hidden shadow-lg">
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
 />
 </svg>
 <span className="sr-only">Close modal</span>
 </button>

 <div className="px-6 py-4 bg-[#153A5F]">
 <h3 className="text-base font-semibold text-gray-900 lg:text-xl dark:text-white">Wallets</h3>
 </div>

 <div className="p-6 overflow-y-auto flex-1">
 <WalletOptions />
 </div>
 </div>
 </div>
 )}
 </>
 )
}