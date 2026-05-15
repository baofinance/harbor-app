import { Transfer } from "../generated/WrappedCollateral_fxSAVE_maidenFees/ERC20";
import { ethereum } from "@graphprotocol/graph-ts";
import {
  accrueFromFxSaveTransfer,
  handleMaidenWrappedFeeDeferredBlockEnd,
} from "./wrappedCollateralMaidenFeesCore";

export function handleWrappedCollateralTransfer(event: Transfer): void {
  accrueFromFxSaveTransfer(
    event.params.from,
    event.params.to,
    event.params.value,
    event.transaction.hash,
    event.block.timestamp,
    event.logIndex,
    event.block.number
  );
}

export function handleWrappedCollateralFeeDeferredBlock(block: ethereum.Block): void {
  handleMaidenWrappedFeeDeferredBlockEnd(block);
}
