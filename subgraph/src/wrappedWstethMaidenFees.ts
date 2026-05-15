import { Transfer } from "../generated/WrappedCollateral_wstETH_maidenFees/ERC20";
import { accrueFromWstEthTransfer } from "./wrappedCollateralMaidenFeesCore";

export function handleWrappedCollateralTransfer(event: Transfer): void {
  accrueFromWstEthTransfer(
    event.params.from,
    event.params.to,
    event.params.value,
    event.transaction.hash,
    event.block.timestamp,
    event.logIndex,
    event.block.number
  );
}
