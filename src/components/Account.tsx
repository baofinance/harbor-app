'use client'

import {useAccount, useDisconnect, useEnsName, useSwitchChain} from'wagmi'
import {Geo} from "next/font/google";
import {useState} from "react";
import NetworkIconClient from "@/components/NetworkIconClient";
import * as React from "react";

const geo = Geo({
 subsets: ["latin"],
 weight:"400",
 display:"swap",
});

function shortenAddress(address: string, chars = 6) {
 return address ? `${address.slice(0, chars)}...${address.slice(-4)}` :'';
}

function Network({ showModal, setShowModal }: { showModal: boolean, setShowModal: (show: boolean) => void }) {
 const { disconnect } = useDisconnect()
 const { error } = useSwitchChain()

 return (
 <>
 {showModal && (
 <div className={`fixed inset-0 z-50 flex items-center justify-end px-4 pt-36 ${geo.className}`}>
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
 <h3 className="text-base font-semibold text-gray-900 lg:text-xl dark:text-white">
 Networks
 </h3>
 </div>

 <div className="p-6 overflow-y-auto flex-1">
 <NetworkOptions />
 </div>

 <div className="px-6 py-2 flex-1 justify-end">
 <button onClick={() => disconnect()} className="font-semibold hover:text-gray-900">
 Disconnect
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
 const { chain } = useAccount()
 const { chains, switchChain, status } = useSwitchChain()

 return (
 <ul className="space-y-1">

 {chains.map((network) => (
 <li key={network.id}>
 <button
 disabled={!switchChain || network.id === chain?.id}
 onClick={() => switchChain({ chainId: network.id })}
 className="flex items-center gap-4 text-white hover:text-black disabled:opacity-50"
 >
 <NetworkIcon name={network.name} />
 {network.name}
 {status ==='pending' &&' (switching)'}
 </button>
 </li>
 ))}
 </ul>

 );
}

function NetworkIcon({ name }: { name: string }) {
 const variant ='branded';
 const resolvedName = name ==='Anvil' ?'Ethereum' : name;

 return (
 <div className="bg-white-xs">
 <NetworkIconClient name={resolvedName} size={24} variant={variant} />
 </div>
 );
}

export function Account() {
 const { address, chain } = useAccount()
 const { data: ensName } = useEnsName({ address })
 const [showModal, setShowModal] = useState(false)

 const shortenedAddress = shortenAddress(address ??'');

 const handleModal = (show: boolean) => {
 setShowModal(show);
 };

 return (
 <div
 className={`bg-[#FF8A7A] hover:bg-[#FF6B5A] px-6 py-2 pt text-white text-lg tracking-wider transition-all uppercase ${geo.className}`}
 >
 <div className="flex items-center space-x-2" onClick={() => handleModal(true)}>
 {chain && <NetworkIcon name={chain.name} />}
 {shortenedAddress && <div>{ensName ? `${ensName} (${shortenedAddress})` : shortenedAddress}</div>}
 </div>

 <Network showModal={showModal} setShowModal={handleModal} />
 </div>
 )
}