import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Deposit, Withdraw, GenesisEnds, Genesis, EndGenesisCall } from "../generated/SailGenesis_ETH_fxUSD/Genesis";
import { WrappedPriceOracle } from "../generated/SailGenesis_ETH_fxUSD/WrappedPriceOracle";
import { ChainlinkAggregator } from "../generated/SailGenesis_ETH_fxUSD/ChainlinkAggregator";
import { SailGenesisUser, UserList, UserSailPosition, CostBasisLot } from "../generated/schema";

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
}

export function handleGenesisEnd(event: GenesisEnds): void {
  const genesisAddress = event.address;
  const genesis = Genesis.bind(genesisAddress);

  const leveragedTokenRes = genesis.try_leveragedToken();
  if (leveragedTokenRes.reverted) return;
  const leveragedToken = leveragedTokenRes.value;

  const ul = getOrCreateUserList(genesisAddress);
  for (let i = 0; i < ul.users.length; i++) {
    const user = Address.fromBytes(ul.users[i]);
    const guId = genesisAddress.toHexString() + "-" + user.toHexString();
    const gu = SailGenesisUser.load(guId);
    if (gu == null) continue;
    if (gu.netDepositUSD.le(ZERO_BD)) continue;

    const position = getOrCreateUserPosition(leveragedToken, user);
    if (hasGenesisLot(position.id)) continue;

    const claimableRes = genesis.try_claimable(user);
    if (claimableRes.reverted) continue;
    const leveragedAmount = claimableRes.value.getLeveragedAmount();
    if (leveragedAmount.le(ZERO_BI)) continue;

    const costUSD = gu.netDepositUSD.times(GENESIS_RATIO);
    if (position.firstAcquiredAt.equals(ZERO_BI)) position.firstAcquiredAt = event.block.timestamp;

    createGenesisLot(position, leveragedAmount, costUSD, event.block.timestamp, event.block.number, event.transaction.hash);
    position.totalTokensBought = position.totalTokensBought.plus(leveragedAmount);
    position.totalSpentUSD = position.totalSpentUSD.plus(costUSD);
    updateAggregates(position);
    position.lastUpdated = event.block.timestamp;
    position.save();
  }
}

// Some deployments may not reliably emit/encode GenesisEnds; index the endGenesis() call as a fallback.
export function handleEndGenesis(call: EndGenesisCall): void {
  // Reuse the GenesisEnds handler logic by constructing equivalent values from the call context.
  const genesisAddress = call.to;
  const genesis = Genesis.bind(genesisAddress);

  const leveragedTokenRes = genesis.try_leveragedToken();
  if (leveragedTokenRes.reverted) return;
  const leveragedToken = leveragedTokenRes.value;

  const ul = getOrCreateUserList(genesisAddress);
  for (let i = 0; i < ul.users.length; i++) {
    const user = Address.fromBytes(ul.users[i]);
    const guId = genesisAddress.toHexString() + "-" + user.toHexString();
    const gu = SailGenesisUser.load(guId);
    if (gu == null) continue;
    if (gu.netDepositUSD.le(ZERO_BD)) continue;

    const position = getOrCreateUserPosition(leveragedToken, user);
    if (hasGenesisLot(position.id)) continue;

    const claimableRes = genesis.try_claimable(user);
    if (claimableRes.reverted) continue;
    const leveragedAmount = claimableRes.value.getLeveragedAmount();
    if (leveragedAmount.le(ZERO_BI)) continue;

    const costUSD = gu.netDepositUSD.times(GENESIS_RATIO);
    if (position.firstAcquiredAt.equals(ZERO_BI)) position.firstAcquiredAt = call.block.timestamp;

    createGenesisLot(position, leveragedAmount, costUSD, call.block.timestamp, call.block.number, call.transaction.hash);
    position.totalTokensBought = position.totalTokensBought.plus(leveragedAmount);
    position.totalSpentUSD = position.totalSpentUSD.plus(costUSD);
    updateAggregates(position);
    position.lastUpdated = call.block.timestamp;
    position.save();
  }
}


