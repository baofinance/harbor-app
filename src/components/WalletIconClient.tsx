'use client'

import { WalletIcon } from'@web3icons/react'

export default function WalletIconClient({ name, size, variant }: { name: string, size: number, variant: string }) {
 return <WalletIcon name={name} size={size} variant={variant} />
}