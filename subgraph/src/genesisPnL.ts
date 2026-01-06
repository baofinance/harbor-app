import { Address, BigDecimal, BigInt, Bytes, dataSource, ethereum } from "@graphprotocol/graph-ts";
import { Deposit, Withdraw, GenesisEnds, Genesis, EndGenesisCall } from "../generated/SailGenesis_ETH_fxUSD/Genesis";
import { WrappedPriceOracle } from "../generated/SailGenesis_ETH_fxUSD/WrappedPriceOracle";
import { ChainlinkAggregator } from "../generated/SailGenesis_ETH_fxUSD/ChainlinkAggregator";
import { GenesisEnd, SailGenesisTotals, SailGenesisUser, UserList, UserSailPosition, CostBasisLot } from "../generated/schema";

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");
const ONE_BD = BigDecimal.fromString("1");
const E18_BD = BigDecimal.fromString("1000000000000000000");
const CHAINLINK_1E8 = BigDecimal.fromString("100000000");
const GENESIS_RATIO = BigDecimal.fromString("0.5"); // 50% ha / 50% hs

// Chainlink (mainnet) - 8 decimals
const ETH_USD_FEED = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
const BTC_USD_FEED = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");

function toE18(value: BigInt): BigDecimal {
  return value.toBigDecimal().div(E18_BD);
}

function getPriceOracleAddress(genesis: string): string {
  const a = genesis.toLowerCase();
  // Production
  if (a == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc") return "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c"; // ETH/fxUSD
  if (a == "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c") return "0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6"; // BTC/fxUSD
  if (a == "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00") return "0xe370289af2145a5b2f0f7a4a900ebfd478a156db"; // BTC/stETH
  // Test2
  if (a == "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073") return "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c"; // ETH/fxUSD
  if (a == "0x288c61c3b3684ff21adf38d878c81457b19bd2fe") return "0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6"; // BTC/fxUSD
  if (a == "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0") return "0xe370289af2145a5b2f0f7a4a900ebfd478a156db"; // BTC/stETH
  return "";
}

function isEthPegged(genesis: string): boolean {
  const a = genesis.toLowerCase();
  return (
    a == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc" || // prod ETH/fxUSD
    a == "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073" // test2 ETH/fxUSD
  );
}

function isFxUsdGenesis(genesis: string): boolean {
  const a = genesis.toLowerCase();
  // Production
  if (a == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc") return true; // ETH/fxUSD
  if (a == "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c") return true; // BTC/fxUSD
  // Test2
  if (a == "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073") return true; // ETH/fxUSD test2
  if (a == "0x288c61c3b3684ff21adf38d878c81457b19bd2fe") return true; // BTC/fxUSD test2
  return false;
}

function chainlinkUsd(feed: Address): BigDecimal {
  const agg = ChainlinkAggregator.bind(feed);
  const ans = agg.try_latestAnswer();
  if (ans.reverted) return ONE_BD;
  return ans.value.toBigDecimal().div(CHAINLINK_1E8);
}

function wrappedCollateralUsdPrice(genesisAddress: Address): BigDecimal {
  const genesisStr = genesisAddress.toHexString();
  const oracleStr = getPriceOracleAddress(genesisStr);
  if (oracleStr == "") return ZERO_BD;

  const oracle = WrappedPriceOracle.bind(Address.fromString(oracleStr));

  // fxUSD markets: oracle.getPrice() returns fxSAVE price in ETH (1e18).
  // Convert to USD using ETH/USD Chainlink.
  if (isFxUsdGenesis(genesisStr)) {
    const p = oracle.try_getPrice();
    if (p.reverted) return ZERO_BD;
    const fxSaveEth = toE18(p.value);
    if (fxSaveEth.equals(ZERO_BD)) return ZERO_BD;
    return fxSaveEth.times(chainlinkUsd(ETH_USD_FEED));
  }

  const ans = oracle.try_latestAnswer();
  if (ans.reverted) return ZERO_BD;

  const maxUnderlyingPrice = toE18(ans.value.value1);
  const maxWrappedRate = toE18(ans.value.value3);
  if (maxUnderlyingPrice.equals(ZERO_BD) || maxWrappedRate.equals(ZERO_BD)) return ZERO_BD;

  const pegUsd = isEthPegged(genesisStr) ? chainlinkUsd(ETH_USD_FEED) : chainlinkUsd(BTC_USD_FEED);
  return maxUnderlyingPrice.times(maxWrappedRate).times(pegUsd);
}

function getOrCreateUserList(genesisAddress: Address): UserList {
  const id = genesisAddress.toHexString();
  let ul = UserList.load(id);
  if (ul == null) {
    ul = new UserList(id);
    ul.contractAddress = genesisAddress;
    ul.users = [];
    ul.save();
  }
  return ul as UserList;
}

function addUserToList(genesisAddress: Address, user: Address): void {
  const id = genesisAddress.toHexString();
  let ul = UserList.load(id);
  if (ul == null) {
    ul = new UserList(id);
    ul.contractAddress = genesisAddress;
    ul.users = [];
  }

  const userBytes = Bytes.fromHexString(user.toHexString());
  for (let i = 0; i < ul.users.length; i++) {
    if (ul.users[i].equals(userBytes)) {
      ul.save();
      return;
    }
  }

  const newUsers = new Array<Bytes>(ul.users.length + 1);
  for (let i = 0; i < ul.users.length; i++) newUsers[i] = ul.users[i];
  newUsers[ul.users.length] = userBytes;
  ul.users = newUsers;
  ul.save();
}

function getOrCreateGenesisUser(genesisAddress: Address, user: Address, ts: BigInt): SailGenesisUser {
  const id = genesisAddress.toHexString() + "-" + user.toHexString();
  let gu = SailGenesisUser.load(id);
  if (gu == null) {
    gu = new SailGenesisUser(id);
    gu.genesisAddress = genesisAddress;
    gu.user = user;
    gu.netDeposit = ZERO_BI;
    gu.netDepositUSD = ZERO_BD;
    gu.lastUpdated = ts;
    gu.save();
  }
  return gu as SailGenesisUser;
}

function getOrCreateUserPosition(token: Address, user: Address): UserSailPosition {
  const id = token.toHexString() + "-" + user.toHexString();
  let p = UserSailPosition.load(id);
  if (p == null) {
    p = new UserSailPosition(id);
    p.tokenAddress = token;
    p.user = user;
    p.balance = ZERO_BI;
    p.balanceUSD = ZERO_BD;
    p.totalCostBasisUSD = ZERO_BD;
    p.averageCostPerToken = ZERO_BD;
    p.realizedPnLUSD = ZERO_BD;
    p.totalTokensBought = ZERO_BI;
    p.totalTokensSold = ZERO_BI;
    p.totalSpentUSD = ZERO_BD;
    p.totalReceivedUSD = ZERO_BD;
    p.firstAcquiredAt = ZERO_BI;
    p.lastUpdated = ZERO_BI;
    p.save();
  }
  return p as UserSailPosition;
}

function countLots(positionId: string): i32 {
  let count = 0;
  while (true) {
    const lotId = positionId + "-" + count.toString();
    const lot = CostBasisLot.load(lotId);
    if (lot == null) break;
    count++;
    if (count > 4000) break;
  }
  return count;
}

function hasGenesisLot(positionId: string): boolean {
  let i = 0;
  while (true) {
    const lotId = positionId + "-" + i.toString();
    const lot = CostBasisLot.load(lotId);
    if (lot == null) break;
    // Avoid string == comparisons (can crash AS compiler in some graph-cli versions)
    if (lot.eventType.indexOf("genesis") == 0 && !lot.isFullyRedeemed) return true;
    i++;
    if (i > 4000) break;
  }
  return false;
}

function updateAggregates(position: UserSailPosition): void {
  let totalCost = ZERO_BD;
  let totalTokens = ZERO_BI;
  let i = 0;
  while (true) {
    const lotId = position.id + "-" + i.toString();
    const lot = CostBasisLot.load(lotId);
    if (lot == null) break;
    if (!lot.isFullyRedeemed) {
      totalCost = totalCost.plus(lot.costUSD);
      totalTokens = totalTokens.plus(lot.tokenAmount);
    }
    i++;
    if (i > 4000) break;
  }
  position.balance = totalTokens;
  position.totalCostBasisUSD = totalCost;
  const tokDec = toE18(totalTokens);
  position.averageCostPerToken = tokDec.gt(ZERO_BD) ? totalCost.div(tokDec) : ZERO_BD;
}

function createGenesisLot(
  position: UserSailPosition,
  tokenAmount: BigInt,
  costUSD: BigDecimal,
  ts: BigInt,
  blockNumber: BigInt,
  txHash: Bytes
): void {
  const idx = countLots(position.id);
  const lotId = position.id + "-" + idx.toString();

  const lot = new CostBasisLot(lotId);
  lot.position = position.id;
  lot.lotIndex = idx;
  lot.tokenAmount = tokenAmount;
  lot.originalAmount = tokenAmount;
  lot.costUSD = costUSD;
  lot.originalCostUSD = costUSD;
  const tokenDec = toE18(tokenAmount);
  lot.pricePerToken = tokenDec.gt(ZERO_BD) ? costUSD.div(tokenDec) : ZERO_BD;
  lot.eventType = "genesis";
  lot.timestamp = ts;
  lot.blockNumber = blockNumber;
  lot.txHash = txHash;
  lot.isFullyRedeemed = false;
  lot.save();
}

function getOrCreateSailGenesisTotals(genesisAddress: Address): SailGenesisTotals {
  const id = genesisAddress.toHexString();
  let t = SailGenesisTotals.load(id);
  if (t == null) {
    t = new SailGenesisTotals(id);
    t.genesisAddress = genesisAddress;
    t.totalNetDeposit = ZERO_BI;
    t.totalNetDepositUSD = ZERO_BD;
    t.genesisEnded = false;
    t.finalized = false;
    t.save();
  }
  return t as SailGenesisTotals;
}

function getLeveragedToken(genesis: Genesis): Address {
  // Prefer immutable getter if present (many deployments expose LEVERAGED_TOKEN()).
  const levImm = genesis.try_LEVERAGED_TOKEN();
  if (!levImm.reverted) return levImm.value;
  const lev = genesis.try_leveragedToken();
  if (!lev.reverted) return lev.value;
  return Address.zero();
}

function finalizeGenesisLots(
  genesisAddress: Address,
  ts: BigInt,
  blockNumber: BigInt,
  txHash: Bytes
): void {
  const totals = getOrCreateSailGenesisTotals(genesisAddress);
  if (totals.finalized) return;

  // Need a non-zero denominator.
  if (totals.totalNetDeposit.le(ZERO_BI)) return;

  const genesis = Genesis.bind(genesisAddress);

  const leveragedToken = getLeveragedToken(genesis);
  if (leveragedToken.equals(Address.zero())) return;

  const totalLevRes = genesis.try_totalLeveragedAtGenesisEnd();
  if (totalLevRes.reverted) return;
  const totalLeveragedAtEnd = totalLevRes.value;
  if (totalLeveragedAtEnd.le(ZERO_BI)) return;

  // Mark genesis end entity (used elsewhere in this subgraph) exactly once.
  const geId = genesisAddress.toHexString();
  const existingGe = GenesisEnd.load(geId);
  if (existingGe == null) {
    const ge = new GenesisEnd(geId);
    ge.contractAddress = genesisAddress;
    ge.timestamp = ts;
    ge.txHash = txHash;
    ge.blockNumber = blockNumber;
    ge.save();
  }

  const ul = getOrCreateUserList(genesisAddress);
  for (let i = 0; i < ul.users.length; i++) {
    const user = Address.fromBytes(ul.users[i]);
    const guId = genesisAddress.toHexString() + "-" + user.toHexString();
    const gu = SailGenesisUser.load(guId);
    if (gu == null) continue;
    if (gu.netDeposit.le(ZERO_BI)) continue;
    if (gu.netDepositUSD.le(ZERO_BD)) continue;

    const position = getOrCreateUserPosition(leveragedToken, user);
    if (hasGenesisLot(position.id)) continue;

    // Allocate leveraged tokens based on share of total net deposits at genesis end.
    // userLeveragedAtEnd = totalLeveragedAtEnd * userNetDeposit / totalNetDeposit
    const userLeveraged = totalLeveragedAtEnd.times(gu.netDeposit).div(totals.totalNetDeposit);
    if (userLeveraged.le(ZERO_BI)) continue;

    const costUSD = gu.netDepositUSD.times(GENESIS_RATIO);
    if (position.firstAcquiredAt.equals(ZERO_BI)) position.firstAcquiredAt = ts;

    createGenesisLot(position, userLeveraged, costUSD, ts, blockNumber, txHash);
    position.totalTokensBought = position.totalTokensBought.plus(userLeveraged);
    position.totalSpentUSD = position.totalSpentUSD.plus(costUSD);
    updateAggregates(position);
    position.lastUpdated = ts;
    position.save();
  }

  totals.genesisEnded = true;
  totals.genesisEndedAt = ts;
  totals.finalized = true;
  totals.totalLeveragedAtGenesisEnd = totalLeveragedAtEnd;
  totals.leveragedToken = leveragedToken;
  totals.save();
}

export function handleDeposit(event: Deposit): void {
  const genesisAddress = event.address;
  const user = event.params.receiver;
  addUserToList(genesisAddress, user);

  const gu = getOrCreateGenesisUser(genesisAddress, user, event.block.timestamp);
  const usdPrice = wrappedCollateralUsdPrice(genesisAddress);
  const amountUsd = toE18(event.params.collateralIn).times(usdPrice);

  gu.netDeposit = gu.netDeposit.plus(event.params.collateralIn);
  gu.netDepositUSD = gu.netDepositUSD.plus(amountUsd);
  gu.lastUpdated = event.block.timestamp;
  gu.save();

  // Update totals (shares) for genesis-end allocation.
  const totals = getOrCreateSailGenesisTotals(genesisAddress);
  totals.totalNetDeposit = totals.totalNetDeposit.plus(event.params.collateralIn);
  totals.totalNetDepositUSD = totals.totalNetDepositUSD.plus(amountUsd);
  totals.save();
}

export function handleWithdraw(event: Withdraw): void {
  const genesisAddress = event.address;
  const user = event.params.receiver;
  addUserToList(genesisAddress, user);

  const gu = getOrCreateGenesisUser(genesisAddress, user, event.block.timestamp);
  const usdPrice = wrappedCollateralUsdPrice(genesisAddress);
  const amountUsd = toE18(event.params.amount).times(usdPrice);

  gu.netDeposit = gu.netDeposit.minus(event.params.amount);
  if (gu.netDeposit.lt(ZERO_BI)) gu.netDeposit = ZERO_BI;
  gu.netDepositUSD = gu.netDepositUSD.minus(amountUsd);
  if (gu.netDepositUSD.lt(ZERO_BD)) gu.netDepositUSD = ZERO_BD;
  gu.lastUpdated = event.block.timestamp;
  gu.save();

  // Update totals (shares) for genesis-end allocation.
  const totals = getOrCreateSailGenesisTotals(genesisAddress);
  totals.totalNetDeposit = totals.totalNetDeposit.minus(event.params.amount);
  if (totals.totalNetDeposit.lt(ZERO_BI)) totals.totalNetDeposit = ZERO_BI;
  totals.totalNetDepositUSD = totals.totalNetDepositUSD.minus(amountUsd);
  if (totals.totalNetDepositUSD.lt(ZERO_BD)) totals.totalNetDepositUSD = ZERO_BD;
  totals.save();
}

export function handleGenesisEnd(event: GenesisEnds): void {
  const genesisAddress = event.address;
  finalizeGenesisLots(genesisAddress, event.block.timestamp, event.block.number, event.transaction.hash);
}

// Some deployments may not reliably emit/encode GenesisEnds; index the endGenesis() call as a fallback.
export function handleEndGenesis(call: EndGenesisCall): void {
  finalizeGenesisLots(call.to, call.block.timestamp, call.block.number, call.transaction.hash);
}

// Block fallback: detect genesis end and finalize if the event/call handler was missed.
export function handleGenesisBlock(block: ethereum.Block): void {
  const genesisAddress = dataSource.address();
  const totals = getOrCreateSailGenesisTotals(genesisAddress);
  if (totals.finalized) return;

  const genesis = Genesis.bind(genesisAddress);
  const endedRes = genesis.try_genesisIsEnded();
  if (endedRes.reverted || !endedRes.value) return;

  // Use block hash as a deterministic txHash surrogate for the one-time finalization.
  finalizeGenesisLots(genesisAddress, block.timestamp, block.number, block.hash);
}


