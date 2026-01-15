'use client'

import { NetworkIcon } from'@web3icons/react'

export default function NetworkIconClient({ name, size, variant }: { name: string, size: number, variant: string }) {
 return <NetworkIcon name={name} size={size} variant={variant} />
}