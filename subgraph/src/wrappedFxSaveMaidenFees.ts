import { Transfer } from "../generated/WrappedCollateral_fxSAVE_maidenFees/ERC20";
import { accrueFromFxSaveTransfer } from "./wrappedCollateralMaidenFeesCore";

export function handleWrappedCollateralTransfer(event: Transfer): void {
  accrueFromFxSaveTransfer(
    event.params.from,
    event.params.to,
    event.params.value,
    event.block.timestamp
  );
}
