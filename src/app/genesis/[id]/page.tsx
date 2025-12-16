"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import {
 useAccount,
 useContractReads,
 useWriteContract,
 usePublicClient,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import { markets, type Market } from "../../../config/markets";
import { GENESIS_ABI } from "../../../config/contracts";
import { ERC20_ABI, CHAINLINK_ORACLE_ABI } from "@/abis/shared";
import { formatUSD, formatToken, formatDateTime } from "@/utils/formatters";
import { EtherscanLink, TokenLogo, getLogoPath } from "@/components/shared";
import InfoTooltip from "@/components/InfoTooltip";
import HistoricalDataChart from "@/components/HistoricalDataChart";
import Image from "next/image";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";

type PageProps = {
 params: Promise<{ id: string }>;
};

const erc20SymbolABI = [
 {
 inputs: [],
 name:"symbol",
 outputs: [{ type:"string", name:"" }],
 stateMutability:"view",
 type:"function",
 },
] as const;

// Reusable UI pieces styled like PoolClient
function EtherscanLink({
 label,
 address,
}: {
 label: string;
 address?: string;
}) {
 if (!address) return null;
 const etherscanBaseUrl ="https://etherscan.io/address/";
 return (
 <div className="flex justify-between items-center text-sm py-2 border-b border-white/10 last:border-b-0">
 <span className="text-white/70">{label}</span>
 <a
 href={`${etherscanBaseUrl}${address}`}
 target="_blank"
 rel="noopener noreferrer"
 className="font-mono text-white hover:underline flex items-center gap-4"
 >
 {`${address.slice(0, 6)}...${address.slice(-4)}`}
 <svg
 xmlns="http://www.w3.org/2000/svg"
 className="h-3 w-3"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
 />
 </svg>
 </a>
 </div>
 );
}

function ContractInfoSection({ market }: { market: Market }) {
 const a = market.addresses as unknown as Record<string, string | undefined>;
 return (
 <div className="bg-[#17395F] p-3 h-full">
 <h2 className="font-semibold font-mono text-white mb-2">Contract Info</h2>
 <div className="divide-y divide-white/10">
 <EtherscanLink label="Genesis" address={a.genesis} />
 <EtherscanLink label="Collateral Token" address={a.collateralToken} />
 <EtherscanLink label="Pegged Token" address={a.peggedToken} />
 <EtherscanLink label="Leveraged Token" address={a.leveragedToken} />
 <EtherscanLink label="Minter" address={a.minter} />
 <EtherscanLink label="Price Oracle" address={a.priceOracle} />
 </div>
 </div>
 );
}

function InputField({
 value,
 onChange,
 placeholder,
 maxButton,
}: {
 value: string;
 onChange: (value: string) => void;
 placeholder: string;
 maxButton?: { onClick: () => void; label: string };
}) {
 return (
 <div className="flex items-center gap-4 p-3">
 <input
 type="text"
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder}
 className="w-full text-2xl sm:text-3xl font-semibold bg-transparent text-white focus:outline-none pr-2"
 />
 {maxButton && (
 <button
 onClick={maxButton.onClick}
 className="text-xs text-white/80 hover:text-white px-2 py-1 rounded-full"
 >
 {maxButton.label}
 </button>
 )}
 </div>
 );
}

function ActionButton({
 onClick,
 disabled,
 isLoading,
 children,
 loadingText,
}: {
 onClick: () => void;
 disabled: boolean;
 isLoading: boolean;
 children: React.ReactNode;
 loadingText?: string;
}) {
 return (
 <button
 onClick={onClick}
 disabled={disabled || isLoading}
 className="w-full py-2 text-sm hover:outline-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
 >
 {isLoading ? loadingText ||"Processing..." : children}
 </button>
 );
}

function BalanceDisplay({
 label,
 value,
 token,
}: {
 label: string;
 value: string;
 token?: string;
}) {
 return (
 <div className="flex justify-between items-center mb-1">
 <p className="text-xs text-white/60">{label}</p>
 <p className="text-sm text-white font-mono">
 {value} {token}
 </p>
 </div>
 );
}

// Tabs for Genesis actions (Deposit / Withdraw / Claim)
function GenesisActionTabs({
 activeTab,
 setActiveTab,
 depositAmount,
 setDepositAmount,
 withdrawAmount,
 setWithdrawAmount,
 walletBalance,
 userDeposit,
 collateralSymbol,
 claimable,
 claimablePegged,
 claimableLeveraged,
 peggedTokenSymbol,
 leveragedTokenSymbol,
 error,
 isConnected,
 isApproveLoading,
 isDepositLoading,
 isWithdrawLoading,
 isClaiming,
 handleDeposit,
 handleWithdraw,
 handleClaim,
 handleMaxDeposit,
 handleMaxWithdraw,
 roiPercent,
 roiBreakdown,
 fdvUSD,
}: {
 activeTab:"deposit" |"withdraw" |"claim";
 setActiveTab: (tab:"deposit" |"withdraw" |"claim") => void;
 depositAmount: string;
 setDepositAmount: (v: string) => void;
 withdrawAmount: string;
 setWithdrawAmount: (v: string) => void;
 walletBalance: bigint;
 userDeposit: bigint;
 collateralSymbol: string;
 claimable: bigint;
 claimablePegged: bigint;
 claimableLeveraged: bigint;
 peggedTokenSymbol: string;
 leveragedTokenSymbol: string;
 error: string | null;
 isConnected: boolean;
 isApproveLoading: boolean;
 isDepositLoading: boolean;
 isWithdrawLoading: boolean;
 isClaiming: boolean;
 handleDeposit: () => void;
 handleWithdraw: () => void;
 handleClaim: () => void;
 handleMaxDeposit: () => void;
 handleMaxWithdraw: () => void;
 roiPercent?: number;
 roiBreakdown?: {
 userSharePct: number;
 poolValueUSD: number;
 estUserValueUSD: number;
 };
 fdvUSD: number;
}) {
 const formatAmount = (v?: bigint) =>
 v ? (Number(v) / 1e18).toFixed(4) :"0.00";
 return (
 <div className="bg-[#17395F] p-3 h-full flex flex-col">
 <div className="flex gap-4 mb-3">
 {(
 [
 ["deposit","Deposit"],
 ["withdraw","Withdraw"],
 ["claim","Claim"],
 ] as const
 ).map(([key, label]) => (
 <button
 key={key}
 onClick={() => setActiveTab(key)}
 className={`px-3 py-1.5 text-sm transition-colors rounded-full ${
 activeTab === key
 ?"text-white bg-white/10"
 :"text-white/80 bg-transparent hover:bg-white/5"
 }`}
 >
 {label}
 </button>
 ))}
 </div>

 <div className="flex-grow">
 {activeTab ==="deposit" && (
 <div className="space-y-3">
 <BalanceDisplay
 label="Wallet Balance"
 value={formatAmount(walletBalance)}
 token={collateralSymbol}
 />
 <InputField
 value={depositAmount}
 onChange={setDepositAmount}
 placeholder="0.0"
 maxButton={{ onClick: handleMaxDeposit, label:"MAX" }}
 />
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <p className="text-xs text-white/60">Estimated ROI</p>
 <InfoTooltip
 side="top"
 label={
 <div className="text-left">
 <div>
 Pool value: $
 {roiBreakdown
 ? roiBreakdown.poolValueUSD.toLocaleString()
 :"-"}
 </div>
 <div>
 Your share:{""}
 {roiBreakdown
 ? roiBreakdown.userSharePct.toFixed(2)
 :"-"}
 %
 </div>
 <div>
 Your est. value: $
 {roiBreakdown
 ? roiBreakdown.estUserValueUSD.toLocaleString()
 :"-"}
 </div>
 <div className="text-white/60">
 Assumes FDV ${fdvUSD.toLocaleString()}
 </div>
 </div>
 }
 />
 </div>
 <p className="text-sm text-white font-mono">
 {roiPercent !== undefined && Number.isFinite(roiPercent)
 ? `${roiPercent.toFixed(0)}%`
 :"-"}
 </p>
 </div>
 {error && <p className="text-sm text-rose-400">{error}</p>}
 <ActionButton
 onClick={handleDeposit}
 disabled={!isConnected || !depositAmount}
 isLoading={isDepositLoading || isApproveLoading}
 >
 Deposit
 </ActionButton>
 </div>
 )}

 {activeTab ==="withdraw" && (
 <div className="space-y-3">
 <BalanceDisplay
 label="Genesis Balance"
 value={formatAmount(userDeposit)}
 token={collateralSymbol}
 />
 <InputField
 value={withdrawAmount}
 onChange={setWithdrawAmount}
 placeholder="0.0"
 maxButton={{ onClick: handleMaxWithdraw, label:"MAX" }}
 />
 {error && <p className="text-sm text-rose-400">{error}</p>}
 <ActionButton
 onClick={handleWithdraw}
 disabled={!isConnected || !withdrawAmount}
 isLoading={isWithdrawLoading}
 >
 Withdraw
 </ActionButton>
 </div>
 )}

 {activeTab ==="claim" && (
 <div className="space-y-3">
 <div>
 <p className="text-xs text-white/60 mb-2">Claimable Tokens</p>
 <div className="space-y-2">
 {claimablePegged > 0n && (
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-sm text-white font-mono">
 {formatAmount(claimablePegged)} {peggedTokenSymbol}
 </span>
 <Image
 src={getLogoPath(peggedTokenSymbol)}
 alt={peggedTokenSymbol}
 width={24}
 height={24}
 className="flex-shrink-0"
 />
 </div>
 </div>
 )}
 {claimableLeveraged > 0n && (
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-sm text-white font-mono">
 {formatAmount(claimableLeveraged)}{""}
 {leveragedTokenSymbol}
 </span>
 <Image
 src={getLogoPath(leveragedTokenSymbol)}
 alt={leveragedTokenSymbol}
 width={24}
 height={24}
 className="flex-shrink-0"
 />
 </div>
 </div>
 )}
 {claimablePegged === 0n && claimableLeveraged === 0n && (
 <p className="text-sm text-white/60">No tokens to claim</p>
 )}
 </div>
 </div>
 {error && <p className="text-sm text-rose-400">{error}</p>}
 <ActionButton
 onClick={handleClaim}
 disabled={!isConnected || !claimable}
 isLoading={isClaiming}
 >
 Claim
 </ActionButton>
 </div>
 )}
 </div>
 </div>
 );
}

export default function GenesisMarketPage({ params }: PageProps) {
 const { id } = use(params);
 const market = (markets as Record<string, Market>)[id] as Market | undefined;
 const { address, isConnected } = useAccount();
 const { writeContractAsync } = useWriteContract();
 const publicClient = usePublicClient();

 // Removed deposit/withdraw modals; keep only claim action
 const [isClaiming, setIsClaiming] = useState(false);
 const [claimError, setClaimError] = useState<string | null>(null);
 const [claimTx, setClaimTx] = useState<string | null>(null);

 // Inline actions state
 const [depositAmount, setDepositAmount] = useState("");
 const [withdrawAmount, setWithdrawAmount] = useState("");
 const [isApproveLoading, setIsApproveLoading] = useState(false);
 const [isDepositLoading, setIsDepositLoading] = useState(false);
 const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
 const [actionError, setActionError] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<"deposit" |"withdraw" |"claim">(
"deposit"
 );

 const genesisAddress = market?.addresses?.genesis as
 | `0x${string}`
 | undefined;

 const { data: reads } = useContractReads({
 contracts: genesisAddress
 ? [
 {
 address: genesisAddress,
 abi: GENESIS_ABI,
 functionName:"genesisIsEnded",
 },
 {
 address: genesisAddress,
 abi: GENESIS_ABI,
 functionName:"totalDeposits",
 },
 {
 address: genesisAddress,
 abi: GENESIS_ABI,
 functionName:"balanceOf",
 args: [
 (address ??
"0x0000000000000000000000000000000000000000") as `0x${string}`,
 ],
 },
 {
 address: genesisAddress,
 abi: GENESIS_ABI,
 functionName:"collateralToken",
 },
 ...(address
 ? [
 {
 address: genesisAddress,
 abi: GENESIS_ABI,
 functionName:"claimable",
 args: [address as `0x${string}`],
 },
 ]
 : []),
 ]
 : [],
 query: { enabled: !!genesisAddress },
 });

 const isEnded = (reads?.[0]?.result as boolean) ?? false;
 const totalDeposits = (reads?.[1]?.result as bigint | undefined) ?? 0n;
 const userDeposit = (reads?.[2]?.result as bigint | undefined) ?? 0n;
 const collateralAddress = reads?.[3]?.result as `0x${string}` | undefined;
 const userClaimable = (reads?.[4]?.result as
 | [bigint, bigint]
 | undefined) ?? [0n, 0n];
 const userClaimableSum =
 (userClaimable?.[0] || 0n) + (userClaimable?.[1] || 0n);

 // Collateral symbol, wallet balance, and allowance
 const { data: tokenSymbolRead } = useContractReads({
 contracts: collateralAddress
 ? [
 {
 address: collateralAddress,
 abi: erc20SymbolABI,
 functionName:"symbol",
 },
 ]
 : [],
 query: { enabled: !!collateralAddress },
 });
 const collateralSymbol =
 (tokenSymbolRead?.[0]?.result as string | undefined) ??"";

 const { data: assetReads } = useContractReads({
 contracts:
 collateralAddress && address && genesisAddress
 ? [
 {
 address: collateralAddress,
 abi: ERC20_ABI,
 functionName:"balanceOf",
 args: [address as `0x${string}`],
 },
 {
 address: collateralAddress,
 abi: ERC20_ABI,
 functionName:"allowance",
 args: [address as `0x${string}`, genesisAddress as `0x${string}`],
 },
 ]
 : [],
 query: { enabled: !!collateralAddress && !!address && !!genesisAddress },
 });
 const walletBalance = (assetReads?.[0]?.result as bigint | undefined) ?? 0n;
 const allowance = (assetReads?.[1]?.result as bigint | undefined) ?? 0n;

 // Minimal ROI calculation (FDV $25m), with preview from depositAmount
 // Use collateralPrice for calculating USD value of deposits
 const oracleAddress = market?.addresses?.collateralPrice as
 | `0x${string}`
 | undefined;
 const { data: oracleReads } = useContractReads({
 contracts: oracleAddress
 ? [
 {
 address: oracleAddress,
 abi: CHAINLINK_ORACLE_ABI,
 functionName:"decimals",
 },
 {
 address: oracleAddress,
 abi: CHAINLINK_ORACLE_ABI,
 functionName:"latestAnswer",
 },
 ]
 : [],
 query: { enabled: !!oracleAddress },
 });
 const priceDecimals = Number(
 (oracleReads?.[0]?.result as unknown as number) ?? 0
 );
 const priceRaw = oracleReads?.[1]?.result as unknown as bigint | undefined;
 
 // Fetch CoinGecko price if available
 const coinGeckoId = (market as any)?.coinGeckoId as string | undefined;
 const { price: coinGeckoPriceUSD } = useCoinGeckoPrice(
 coinGeckoId ||"",
 60000
 );

 // Use CoinGecko price if available, otherwise use oracle price
 const stEthPriceUSD: number = coinGeckoPriceUSD
 ? coinGeckoPriceUSD
 : priceRaw
 ? Number(priceRaw) / 10 ** priceDecimals
 : 0;

 const rewardPoolTokens = Number((market as any)?.rewardToken?.amount || 0);
 const parsedDeposit = (() => {
 if (!depositAmount) return 0n;
 try {
 return parseEther(depositAmount);
 } catch {
 return 0n;
 }
 })();
 const totalDepositsPreview = totalDeposits + parsedDeposit;
 const userDepositPreview = userDeposit + parsedDeposit;
 const totalDepositsStEth = Number(totalDepositsPreview) / 1e18;
 const userDepositStEth = Number(userDepositPreview) / 1e18;
 const FDV_USD = 25_000_000;
 const MAX_SUPPLY = 100_000_000;
 let roiPercent: number | undefined = undefined;
 let roiBreakdown:
 | { userSharePct: number; poolValueUSD: number; estUserValueUSD: number }
 | undefined = undefined;
 if (
 totalDepositsStEth > 0 &&
 userDepositStEth > 0 &&
 stEthPriceUSD &&
 stEthPriceUSD > 0
 ) {
 const poolValueUSD = rewardPoolTokens * (FDV_USD / MAX_SUPPLY);
 const userShare = userDepositStEth / totalDepositsStEth;
 const estUserValueUSD = poolValueUSD * userShare;
 const userCostUSD = userDepositStEth * stEthPriceUSD;
 roiPercent = (estUserValueUSD / userCostUSD) * 100;
 roiBreakdown = {
 userSharePct: userShare * 100,
 poolValueUSD,
 estUserValueUSD,
 };
 }

 const isLoadingCore = !reads && !!genesisAddress;

 // Handlers
 const handleMaxDeposit = () => {
 setDepositAmount(walletBalance ? formatEther(walletBalance) :"");
 };
 const handleMaxWithdraw = () => {
 setWithdrawAmount(formatEther(userDeposit));
 };

 const handleDeposit = async () => {
 setActionError(null);
 if (!address || !genesisAddress || !collateralAddress || !depositAmount)
 return;
 let amount: bigint;
 try {
 amount = parseEther(depositAmount);
 } catch {
 setActionError("Invalid amount");
 return;
 }
 try {
 if (amount <= 0n) {
 setActionError("Amount must be greater than 0");
 return;
 }
 if (walletBalance < amount) {
 setActionError("Insufficient balance");
 return;
 }
 if (allowance < amount) {
 setIsApproveLoading(true);
 await writeContractAsync({
 address: collateralAddress,
 abi: ERC20_ABI,
 functionName:"approve",
 args: [genesisAddress, amount],
 });
 setIsApproveLoading(false);
 }
 setIsDepositLoading(true);
 await writeContractAsync({
 address: genesisAddress,
 abi: GENESIS_ABI,
 functionName:"deposit",
 args: [amount, address],
 });
 setDepositAmount("");
 } catch (e) {
 setActionError(e instanceof Error ? e.message :"Deposit failed");
 } finally {
 setIsDepositLoading(false);
 setIsApproveLoading(false);
 }
 };

 const handleWithdraw = async () => {
 setActionError(null);
 if (!address || !genesisAddress || !withdrawAmount) return;
 let amount: bigint;
 try {
 amount = parseEther(withdrawAmount);
 } catch {
 setActionError("Invalid amount");
 return;
 }
 try {
 if (amount <= 0n) {
 setActionError("Amount must be greater than 0");
 return;
 }
 if (userDeposit < amount) {
 setActionError("Amount exceeds your deposit");
 return;
 }
 setIsWithdrawLoading(true);
 await writeContractAsync({
 address: genesisAddress,
 abi: GENESIS_ABI,
 functionName:"withdraw",
 args: [amount, address],
 });
 setWithdrawAmount("");
 } catch (e) {
 setActionError(e instanceof Error ? e.message :"Withdraw failed");
 } finally {
 setIsWithdrawLoading(false);
 }
 };

 const handleClaim = async () => {
 if (!genesisAddress || !address) return;
 try {
 setClaimError(null);
 setIsClaiming(true);
 setClaimTx(null);
 const tx = await writeContractAsync({
 address: genesisAddress as `0x${string}`,
 abi: GENESIS_ABI,
 functionName:"claim",
 args: [address as `0x${string}`],
 });
 setClaimTx(tx);
 await publicClient?.waitForTransactionReceipt({ hash: tx });
 } catch (e) {
 setClaimError(e instanceof Error ? e.message :"Claim failed");
 } finally {
 setIsClaiming(false);
 }
 };

 // If market id is invalid, show not found after hooks have been called
 if (!market) {
 return (
 <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
 <main className="container mx-auto px-4 sm:px-10 pb-6">
 <div className="bg-[#17395F] p-6 text-center">
 <h1 className="text-lg font-semibold text-white">
 Market not found
 </h1>
 <p className="mt-2 text-white/60">
 The requested Genesis market does not exist.
 </p>
 <div className="mt-4">
 <Link href="/genesis" className="text-harbor hover:opacity-80">
 ← Back to Genesis
 </Link>
 </div>
 </div>
 </main>
 </div>
 );
 }

 const rewardTokenSymbol =
 (market as any).rewardToken?.symbol || (market as any).rewardPoints
 ?"Ledger Marks"
 :"";

 const statusColor = isEnded
 ?"bg-orange-900/30 text-orange-400 border-orange-500/30"
 :"bg-harbor/10 text-harbor border-harbor/30";
 const statusLabel = isEnded ?"ENDED" :"ACTIVE";

 return (
 <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative px-4 sm:px-10">
 <main className="container mx-auto max-w-full pb-8 relative z-10">
 {/* Breadcrumb */}
 <div className="mb-3">
 <Link
 href="/genesis"
 className="inline-flex items-center gap-4 text-white/60 hover:text-white"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 xmlns="http://www.w3.org/2000/svg"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth="2"
 d="M10 19l-7-7m0 0l7-7m-7 7h18"
 ></path>
 </svg>
 Genesis
 </Link>
 </div>

 {/* Header */}
 <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
 <div>
 <h1 className="text-2xl font-semibold font-mono text-white">
 {market?.name}
 </h1>
 <p className="text-xs text-white/60">
 {market?.chain?.name ??""} • Genesis
 </p>
 </div>
 <div className="flex items-center gap-4">
 <span
 className={`px-2 py-1 border text-[10px] uppercase ${statusColor}`}
 >
 {statusLabel}
 </span>
 </div>
 </div>

 {/* Overview stats */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
 <div className="bg-[#17395F] p-3">
 <div className="flex items-center gap-4 mb-1">
 <h3 className="font-semibold font-mono text-white">
 Total Deposits
 </h3>
 <InfoTooltip
 label="Total collateral deposited into Genesis."
 side="top"
 />
 </div>
 <div className="text-white font-mono text-lg">
 {isLoadingCore
 ?"–"
 : `${formatEther(totalDeposits)} ${collateralSymbol}`}
 </div>
 </div>
 <div className="bg-[#17395F] p-3">
 <div className="flex items-center gap-4 mb-1">
 <h3 className="font-semibold font-mono text-white">
 Your Deposit
 </h3>
 <InfoTooltip label="Your current deposit amount." side="top" />
 </div>
 <div className="text-white font-mono text-lg">
 {isLoadingCore
 ?"–"
 : `${formatEther(userDeposit)} ${collateralSymbol}`}
 </div>
 </div>
 <div className="bg-[#17395F] p-3">
 <div className="flex items-center gap-4 mb-1">
 <h3 className="font-semibold font-mono text-white">Claimable</h3>
 <InfoTooltip label="Claimable reward tokens." side="top" />
 </div>
 <div className="text-white font-mono text-lg">
 {isLoadingCore
 ?"–"
 : `${formatEther(userClaimableSum)} ${rewardTokenSymbol}`}
 </div>
 </div>
 <div className="bg-[#17395F] p-3">
 <div className="flex items-center gap-4 mb-1">
 <h3 className="font-semibold font-mono text-white">
 Estimated ROI
 </h3>
 <InfoTooltip
 label="Based on FDV assumption and your share."
 side="top"
 />
 </div>
 <div className="text-white font-mono text-lg">
 {roiPercent !== undefined && Number.isFinite(roiPercent)
 ? `${roiPercent.toFixed(0)}%`
 :"-"}
 </div>
 <div className="text-[10px] text-white/40 mt-0.5">
 Assumes FDV $25m
 </div>
 </div>
 </div>

 {/* Chart */}
 <div className="mt-2">
 <div className="bg-[#17395F] p-2 w-full">
 <div className="h-[340px] sm:h-[420px]">
 <HistoricalDataChart marketId={id} />
 </div>
 </div>
 </div>

 {/* Actions + Contract info */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
 <div className="lg:col-span-2 h-full">
 <GenesisActionTabs
 activeTab={activeTab}
 setActiveTab={setActiveTab}
 depositAmount={depositAmount}
 setDepositAmount={(v) => {
 if (v ==="" || /^\d*\.?\d*$/.test(v)) setDepositAmount(v);
 }}
 withdrawAmount={withdrawAmount}
 setWithdrawAmount={(v) => {
 if (v ==="" || /^\d*\.?\d*$/.test(v)) setWithdrawAmount(v);
 }}
 walletBalance={walletBalance}
 userDeposit={userDeposit}
 collateralSymbol={collateralSymbol}
 claimable={userClaimableSum}
 claimablePegged={userClaimable?.[0] || 0n}
 claimableLeveraged={userClaimable?.[1] || 0n}
 peggedTokenSymbol={(market as any)?.peggedToken?.symbol ||"haPB"}
 leveragedTokenSymbol={
 (market as any)?.leveragedToken?.symbol ||"hsPB"
 }
 error={actionError}
 isConnected={!!isConnected}
 isApproveLoading={isApproveLoading}
 isDepositLoading={isDepositLoading}
 isWithdrawLoading={isWithdrawLoading}
 isClaiming={isClaiming}
 handleDeposit={handleDeposit}
 handleWithdraw={handleWithdraw}
 handleClaim={handleClaim}
 handleMaxDeposit={handleMaxDeposit}
 handleMaxWithdraw={handleMaxWithdraw}
 roiPercent={roiPercent}
 roiBreakdown={roiBreakdown}
 fdvUSD={FDV_USD}
 />
 </div>
 <div className="lg:col-span-1 h-full">
 <ContractInfoSection market={market} />
 </div>
 </div>

 {/* Claim statuses (tx/error) */}
 {(claimError || claimTx) && (
 <div className="bg-[#17395F] p-3 mt-3">
 {claimError && (
 <p className="text-sm text-rose-400">{claimError}</p>
 )}
 {claimTx && (
 <p className="mt-2 text-xs text-white/50">
 Tx:{""}
 <a
 href={`https://etherscan.io/tx/${claimTx}`}
 target="_blank"
 rel="noreferrer"
 className="text-harbor underline"
 >
 {claimTx.slice(0, 10)}...{claimTx.slice(-8)}
 </a>
 </p>
 )}
 </div>
 )}
 </main>
 </div>
 );
}
