import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { MarksEvent } from "../generated/schema";

const E18_BD = BigDecimal.fromString("1000000000000000000");
const ZERO_TX = Bytes.fromHexString(
  "0x0000000000000000000000000000000000000000000000000000000000000000"
);

export function toE18BigInt(value: BigDecimal): BigInt {
  const scaled = value.times(E18_BD).truncate(0);
  return BigInt.fromString(scaled.toString());
}

export function createMarksEvent(params: {
  id: string;
  user: Bytes;
  amountE18: BigInt;
  eventType: string;
  timestamp: BigInt;
  blockNumber: BigInt;
  txHash?: Bytes;
}): void {
  const event = new MarksEvent(params.id);
  event.user = params.user;
  event.amount = params.amountE18;
  event.eventType = params.eventType;
  event.timestamp = params.timestamp;
  event.blockNumber = params.blockNumber;
  event.txHash = params.txHash ? params.txHash : ZERO_TX;
  event.save();
}
