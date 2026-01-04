/**
 * Print the effective minimum deposit for each Stability Pool by:
 * - reading `ASSET_TOKEN()`, and
 * - simulating `deposit(1, receiver, 0)` and decoding `DepositAmountLessThanMinimum(amount, minimum)`
 *
 * This does NOT require the pool to expose a `MIN_DEPOSIT()` getter.
 *
 * Usage:
 *   node scripts/printStabilityPoolMinDeposits.js --test2 [rpcUrl]
 *   node scripts/printStabilityPoolMinDeposits.js --prod  [rpcUrl]
 *   node scripts/printStabilityPoolMinDeposits.js --all   [rpcUrl]
 *
 * If rpcUrl is omitted it defaults to http://127.0.0.1:8545 (anvil/fork).
 */

const fs = require("fs");
const path = require("path");
const {
  createPublicClient,
  http,
  formatEther,
  BaseError,
  ContractFunctionRevertedError,
} = require("viem");
const { anvil, mainnet } = require("viem/chains");

const DEAD = "0x000000000000000000000000000000000000dEaD";

// Minimal ABI required for our calls + decoding.
const STABILITY_POOL_ABI = [
  {
    type: "error",
    name: "DepositAmountLessThanMinimum",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "minimum", type: "uint256" },
    ],
  },
  {
    inputs: [],
    name: "ASSET_TOKEN",
    outputs: [{ name: "token", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "assetIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minAmount", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const rpcUrl =
    args.find((a) => !a.startsWith("--")) ||
    process.env.MAINNET_RPC_URL ||
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
    "http://127.0.0.1:8545";

  const mode = flags.has("--all")
    ? "all"
    : flags.has("--test2")
      ? "test2"
      : flags.has("--prod")
        ? "prod"
        : "all";

  return { mode, rpcUrl };
}

function loadDeployLogs(mode) {
  const deployDir = path.join(process.cwd(), "DeployLog");
  const files = fs
    .readdirSync(deployDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(deployDir, f));

  const wantedPrefixes =
    mode === "all" ? new Set(["test2", "harbor_v1"]) : new Set([mode === "prod" ? "harbor_v1" : "test2"]);

  const logs = [];
  for (const file of files) {
    try {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!json?.contracts?.stabilityPoolCollateral?.address) continue;
      if (!json?.contracts?.stabilityPoolLeveraged?.address) continue;
      if (!wantedPrefixes.has(String(json?.prefix || ""))) continue;
      logs.push({ file: path.basename(file), json });
    } catch {
      // ignore
    }
  }

  // keep output stable-ish
  logs.sort((a, b) => a.file.localeCompare(b.file));
  return logs;
}

async function getMinDepositFromSimulate(client, poolAddress) {
  try {
    await client.simulateContract({
      address: poolAddress,
      abi: STABILITY_POOL_ABI,
      functionName: "deposit",
      args: [1n, DEAD, 0n],
      account: DEAD,
    });
    // If it DOESN'T revert, minimum is <= 1 wei (very unlikely).
    return { ok: true, minimum: 0n, note: "simulate succeeded for amount=1 (minimum <= 1 wei?)" };
  } catch (err) {
    if (err instanceof BaseError) {
      const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
      if (revertError instanceof ContractFunctionRevertedError) {
        const errorName = revertError.data?.errorName;
        const args = revertError.data?.args;
        if (errorName === "DepositAmountLessThanMinimum" && Array.isArray(args) && args.length >= 2) {
          const minimum = args[1];
          return { ok: true, minimum: BigInt(minimum), note: null };
        }
        return { ok: false, minimum: null, note: `reverted with ${errorName || "unknown"} (could not extract min)` };
      }
    }
    return { ok: false, minimum: null, note: err?.shortMessage || err?.message || "unknown error" };
  }
}

async function main() {
  const { mode, rpcUrl } = parseArgs();

  const chain = rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost") ? anvil : mainnet;
  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  const logs = loadDeployLogs(mode);
  if (!logs.length) {
    console.error("No deploy logs found for mode:", mode);
    process.exit(1);
  }

  console.log(`\n🔎 Stability Pool minimum deposit report (mode=${mode})`);
  console.log(`RPC: ${rpcUrl}\n`);

  for (const { file, json } of logs) {
    const marketLabel = `${json?.prefix || "?"}::${json?.peggedTicker || "?"}::${json?.networks?.mainnet?.collateral ? json?.contracts?.collateral?.symbol || "?" : "?"}`;
    const peggedSymbol = json?.contracts?.pegged?.symbol || "haTOKEN";
    const peggedAddress = json?.contracts?.pegged?.address || "unknown";

    const pools = [
      { name: "collateral", address: json.contracts.stabilityPoolCollateral.address },
      { name: "sail", address: json.contracts.stabilityPoolLeveraged.address },
    ];

    console.log(`=== ${file} (${marketLabel}) ===`);
    console.log(`pegged: ${peggedSymbol} (${peggedAddress})`);

    for (const p of pools) {
      let assetToken = null;
      try {
        assetToken = await client.readContract({
          address: p.address,
          abi: STABILITY_POOL_ABI,
          functionName: "ASSET_TOKEN",
        });
      } catch (e) {
        // ignore
      }

      const min = await getMinDepositFromSimulate(client, p.address);
      if (min.ok) {
        console.log(
          `- ${p.name.padEnd(9)} ${p.address}  ASSET_TOKEN=${assetToken || "?"}  MIN_DEPOSIT≈${formatEther(min.minimum)} ${peggedSymbol} (raw=${min.minimum.toString()})${min.note ? ` (${min.note})` : ""}`
        );
      } else {
        console.log(
          `- ${p.name.padEnd(9)} ${p.address}  ASSET_TOKEN=${assetToken || "?"}  MIN_DEPOSIT=?  (${min.note})`
        );
      }
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


