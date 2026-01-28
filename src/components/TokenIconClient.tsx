'use client'

import { TokenIcon } from '@web3icons/react'
import TokenIconLocal from '@/components/TokenIcon'
import { getLogoPath } from '@/lib/logos'

interface TokenIconClientProps {
  symbol: string
  size?: number
  variant?: 'mono' | 'branded' | 'background'
  className?: string
  width?: number
  height?: number
}

/**
 * TokenIconClient - Uses web3icons TokenIcon for standard tokens,
 * falls back to local icons for haTokens and hsTokens
 */
export default function TokenIconClient({ 
  symbol, 
  size = 20, 
  variant = 'branded',
  className,
  width,
  height
}: TokenIconClientProps) {
  const normalizedSymbol = symbol.toLowerCase()
  
  // Check if it's a Harbor token (haToken or hsToken) - these aren't in web3icons yet
  const isHarborToken = normalizedSymbol.startsWith('ha') || normalizedSymbol.startsWith('hs')
  
  // WETH might not be in web3icons or might not work properly, use local icon
  // "all" = "All pools" filter uses Harbor logo
  const useLocalIcon = isHarborToken || normalizedSymbol === 'weth' || normalizedSymbol === 'all'
  
  // If it's a Harbor token or WETH, use local icons directly
  if (useLocalIcon) {
    const logoPath = getLogoPath(symbol)
    return (
      <TokenIconLocal
        src={logoPath}
        alt={symbol}
        width={width || size}
        height={height || size}
        className={className}
      />
    )
  }
  
  // For standard tokens, try web3icons first, then fallback to local icons
  // web3icons TokenIcon will handle its own fallback, but we can also provide a fallback prop
  const logoPath = getLogoPath(symbol)
  
  return (
    <TokenIcon
      symbol={symbol}
      size={size}
      variant={variant}
      className={className}
      fallback={
        <TokenIconLocal
          src={logoPath}
          alt={symbol}
          width={width || size}
          height={height || size}
          className={className}
        />
      }
    />
  )
}
