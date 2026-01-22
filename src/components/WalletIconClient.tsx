'use client'

import { WalletIcon } from'@web3icons/react/dynamic'
import {TVariant} from "@web3icons/common";

export default function WalletIconClient({ name, size, variant }: { name: string, size: number, variant: TVariant }) {
    return <WalletIcon name={name} size={size} variant={variant} className="wallet-icon-client"/>
}