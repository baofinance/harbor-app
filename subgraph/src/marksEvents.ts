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

export function createMarksEvent(
  id: string,
  user: Bytes,
  amountE18: BigInt,
  eventType: string,
  timestamp: BigInt,
  blockNumber: BigInt,
  txHash: Bytes = ZERO_TX
): void {
  const event = new MarksEvent(id);
  event.user = user;
  event.amount = amountE18;
  event.eventType = eventType;
  event.timestamp = timestamp;
  event.blockNumber = blockNumber;
  event.txHash = txHash;
  event.save();
}
