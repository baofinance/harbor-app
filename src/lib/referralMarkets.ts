import { markets } from "@/config/contracts";

export type WrappedCollateralToken = "fxSAVE" | "wstETH";

const FX_SAVE_ADDRESS = "0x7743e50f534a7f9f1791dde7dcd89f7783eefc39";
const WSTETH_ADDRESS = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";

export function getWrappedTokenForMinter(minter: string): WrappedCollateralToken | null {
  const addr = minter.toLowerCase();
  const values = Object.values(markets);
  for (const market of values) {
    if (market.addresses.minter.toLowerCase() !== addr) continue;
    const wrapped = market.addresses.wrappedCollateralToken.toLowerCase();
    if (wrapped === FX_SAVE_ADDRESS) return "fxSAVE";
    if (wrapped === WSTETH_ADDRESS) return "wstETH";
    return null;
  }
  return null;
}
