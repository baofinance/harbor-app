'use client'

import { NetworkIcon } from '@web3icons/react/dynamic'
import { TVariant } from "@web3icons/common";

export default function NetworkIconClient({name, size, variant}: { name: string, size: number, variant: TVariant }) {
    return <NetworkIcon name={name} size={size} variant={variant}/>
}