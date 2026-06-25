import fs from "fs";
import { getAddress } from "viem";

const POOLS = { launch: 10_000_000, euro: 4_000_000, metals: 1_000_000, harbor: 10_000_000 };
const TOTAL_POOL = 25_000_000;
const MIN_TIDE = 10;
const MAX_PER_WALLET = 10_000_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? null : args[i + 1];
  };
  return {
    launch: get("--launch"),
    euro: get("--euro"),
    metals: get("--metals"),
    harbor: get("--harbor"),
    previewOnly: args.includes("--preview-only"),
    apply: args.includes("--apply"),
    airdropPath: get("--airdrop") ?? "public/data/tide/tide_airdrop.json",
  };
}

function load(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function norm(addr) {
  try {
    return getAddress(addr);
  } catch {
    return addr.toLowerCase();
  }
}

function sumMarks(entries) {
  return entries.reduce((s, e) => s + e.totalMarks, 0);
}

function allocateProRata(entries, pool) {
  const total = sumMarks(entries);
  const out = new Map();
  if (total === 0) return out;
  for (const e of entries) {
    const addr = norm(e.address);
    const share = (pool * e.totalMarks) / total;
    out.set(addr, (out.get(addr) ?? 0) + share);
  }
  return out;
}

function mergePoolMaps(...maps) {
  const out = new Map();
  for (const m of maps) {
    for (const [addr, v] of m) {
      out.set(addr, (out.get(addr) ?? 0) + v);
    }
  }
  return out;
}

function applyMinFloor(alloc) {
  let deficit = 0;
  for (const [addr, v] of alloc) {
    if (v > 0 && v < MIN_TIDE) {
      deficit += MIN_TIDE - v;
      alloc.set(addr, MIN_TIDE);
    }
  }
  if (deficit === 0) return;
  const donors = [...alloc.entries()].filter(([, v]) => v > MIN_TIDE);
  const donorTotal = donors.reduce((s, [, v]) => s + (v - MIN_TIDE), 0);
  for (const [addr, v] of donors) {
    const give = ((v - MIN_TIDE) / donorTotal) * deficit;
    alloc.set(addr, v - give);
  }
}

function applyCapRedistribute(alloc) {
  let excess = 0;
  for (const [addr, v] of alloc) {
    if (v > MAX_PER_WALLET) {
      excess += v - MAX_PER_WALLET;
      alloc.set(addr, MAX_PER_WALLET);
    }
  }
  if (excess === 0) return;
  const recipients = [...alloc.entries()].filter(([, v]) => v < MAX_PER_WALLET);
  const weight = recipients.reduce((s, [, v]) => s + v, 0);
  for (const [addr, v] of recipients) {
    alloc.set(addr, v + (excess * v) / weight);
  }
}

function normalizeTotal(alloc) {
  const sum = [...alloc.values()].reduce((a, b) => a + b, 0);
  const scale = TOTAL_POOL / sum;
  for (const [addr, v] of alloc) alloc.set(addr, v * scale);
}

function finalize(alloc) {
  applyMinFloor(alloc);
  applyCapRedistribute(alloc);
  normalizeTotal(alloc);
  for (let i = 0; i < 8; i++) {
    const before = [...alloc.values()].reduce((a, b) => a + b, 0);
    applyCapRedistribute(alloc);
    normalizeTotal(alloc);
    applyMinFloor(alloc);
    const after = [...alloc.values()].reduce((a, b) => a + b, 0);
    if (Math.abs(after - before) < 1e-6) break;
  }
  return alloc;
}

const cfg = parseArgs();
for (const [k, p] of Object.entries({
  launch: cfg.launch,
  euro: cfg.euro,
  metals: cfg.metals,
  harbor: cfg.harbor,
})) {
  if (!p) {
    console.error(`Missing --${k}`);
    process.exit(1);
  }
}

const launch = allocateProRata(load(cfg.launch).entries, POOLS.launch);
const euro = allocateProRata(load(cfg.euro).entries, POOLS.euro);
const metals = allocateProRata(load(cfg.metals).entries, POOLS.metals);
const harbor = allocateProRata(load(cfg.harbor).entries, POOLS.harbor);

const byPool = { launch, euro, metals, harbor };
const total = finalize(mergePoolMaps(launch, euro, metals, harbor));

const rows = [...total.entries()]
  .map(([address, totalTide]) => ({
    address,
    launch: byPool.launch.get(address) ?? 0,
    euro: byPool.euro.get(address) ?? 0,
    metals: byPool.metals.get(address) ?? 0,
    harbor: byPool.harbor.get(address) ?? 0,
    total_tide: totalTide,
  }))
  .sort((a, b) => b.total_tide - a.total_tide);

const csv = [
  "address,launch,euro,metals,harbor,total_tide",
  ...rows.map((r) =>
    [r.address, r.launch, r.euro, r.metals, r.harbor, r.total_tide].join(",")
  ),
].join("\n");

fs.writeFileSync("tmp-ledger-cap40-both.csv", `${csv}\n`);
console.log("Wrote tmp-ledger-cap40-both.csv");
console.log("Recipients:", rows.length);
console.log("Total TIDE:", rows.reduce((s, r) => s + r.total_tide, 0));
console.log("Top 5:");
rows.slice(0, 5).forEach((r) => console.log(r.address, Math.round(r.total_tide)));

if (cfg.previewOnly) process.exit(0);

if (!cfg.apply) {
  console.log("Preview only. Pass --apply to write tide_airdrop.json");
  process.exit(0);
}

const airdrop = load(cfg.airdropPath);
const ledgerByAddr = new Map(rows.map((r) => [norm(r.address), r.total_tide]));

for (const row of airdrop.allocations) {
  const addr = norm(row.address);
  row.buckets.ledgerMarks = { amountTokens: ledgerByAddr.get(addr) ?? 0 };
  ledgerByAddr.delete(addr);
}

for (const [addr, amountTokens] of ledgerByAddr) {
  airdrop.allocations.push({
    address: addr,
    buckets: {
      veBaoSnapshot: { amountTokens: 0 },
      boosters: { amountTokens: 0 },
      raise: { amountTokens: 0 },
      ledgerMarks: { amountTokens },
    },
  });
}

airdrop.bucketPools.ledgerMarks = TOTAL_POOL;
airdrop.addressCount = airdrop.allocations.length;
airdrop.description =
  "TIDE airdrop eligibility per wallet. Buckets: veBaoSnapshot, boosters, raise, ledgerMarks. " +
  "Ledger marks: pro-rata from maiden voyage (launch/euro/metals) and anchor-sail leaderboards, " +
  "25M TIDE total, min 10 TIDE, 40% per-wallet cap with redistribution.";

fs.writeFileSync(cfg.airdropPath, `${JSON.stringify(airdrop, null, 2)}\n`);
console.log("Updated", cfg.airdropPath);
