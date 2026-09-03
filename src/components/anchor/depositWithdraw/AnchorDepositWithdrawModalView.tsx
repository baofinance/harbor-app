"use client";

import React from "react";
import { flushSync } from "react-dom";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";
import {
  formatTokenAmount18,
  formatBalance,
} from "@/utils/formatters";
import { amountToUSD } from "@/utils/tokenPriceToUSD";
import type {
  AnchorDepositWithdrawTab,
} from "./types";
import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";
import {
  Banknote,
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  TransactionProgressModal,
} from "@/components/TransactionProgressModal";
import { TokenSelectorDropdown } from "@/components/TokenSelectorDropdown";
import TokenIconClient from "@/components/TokenIconClient";
import { TokenAmountSection } from "@/components/TokenAmountSection";
import { DepositModalShell } from "@/components/DepositModalShell";
import { DepositModalTabHeader } from "@/components/DepositModalTabHeader";
import { DepositModalFlowOverview } from "@/components/DepositModalFlowOverview";
import { DepositModalTitle } from "@/components/DepositModalTitle";
import { InfoCallout } from "@/components/InfoCallout";
import { ErrorBanner, ReservedErrorSlot } from "@/components/anchor/ErrorBanner";
import { DepositPermitToggle } from "@/components/deposit/DepositPermitToggle";
import { DepositModalLayout } from "@/components/deposit/DepositModalLayout";
import { AnchorBuyTransactionOverview } from "@/components/anchor/AnchorBuyTransactionOverview";
import { AnchorTransactionOverview } from "@/components/anchor/AnchorTransactionOverview";
import { DepositAmountCard } from "@/components/deposit/DepositAmountCard";
import { DepositBalanceStrip } from "@/components/deposit/DepositBalanceStrip";
import { DepositReceivePreview } from "@/components/deposit/DepositReceivePreview";
import { DepositActionFooter } from "@/components/deposit/DepositActionFooter";
import {
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_AMOUNT_MAX_BUTTON_CLASS,
  ANCHOR_MODAL_CARD_STACK,
  ANCHOR_MODAL_FOOTER_WRAPPER,
  ANCHOR_MODAL_SCROLL_CLASS,
  ANCHOR_MODAL_SECTION_GAP,
  DEPOSIT_EMBEDDED_CONTENT_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
  DEPOSIT_SEGMENT_STACK_CLASS,
  DEPOSIT_SEGMENT_TRACK_CLASS,
  depositAmountInputClass,
} from "@/components/deposit/depositFlowStyles";
import { DepositStabilityPoolCard } from "@/components/deposit/DepositStabilityPoolCard";
import { TokenLogo } from "@/components/shared";
import { buildDepositTokenDropdownGroups } from "@/utils/depositTokenDropdownOptions";
import { useAnchorDepositWithdrawModal } from "./useAnchorDepositWithdrawModal";

export type AnchorDepositWithdrawViewModel = ReturnType<
  typeof useAnchorDepositWithdrawModal
>;

type TabType = AnchorDepositWithdrawTab;

export function AnchorDepositWithdrawModalView(
  props: AnchorDepositWithdrawViewModel,
) {
  const {
    isActive,
    address,
    isConnected,
    connector,
    chainId,
    switchChain,
    isSwitchingChain,
    walletChainId,
    setWalletChainId,
    effectiveChainId,
    depositMode,
    isCollateralOnlyChain,
    nativeTokenLabel,
    isMegaEth,
    marketChainId,
    depositsBlocked,
    marketArchived,
    isCorrectNetwork,
    shouldShowNetworkSwitch,
    handleTxError,
    handleSwitchNetwork,
    ensureCorrectNetwork,
    getInitialTab,
    activeTab,
    setActiveTab,
    poolDeposits,
    haBalances,
    marksError,
    defaultProgressConfig,
    amount,
    setAmount,
    step,
    setStep,
    error,
    setError,
    txHash,
    setTxHash,
    txHashes,
    setTxHashes,
    progressConfig,
    setProgressConfig,
    progress,
    lastNonErrorStepRef,
    slippageTolerance,
    setSlippageTolerance,
    showSlippageInput,
    setShowSlippageInput,
    slippageInputValue,
    setSlippageInputValue,
    debouncedAmount,
    setDebouncedAmount,
    mintOnly,
    setMintOnly,
    showNotifications,
    setShowNotifications,
    withdrawOverviewExpanded,
    setWithdrawOverviewExpanded,
    depositInStabilityPool,
    setDepositInStabilityPool,
    stabilityPoolType,
    setStabilityPoolType,
    withdrawOnly,
    setWithdrawOnly,
    sellRedeemSource,
    setSellRedeemSource,
    withdrawFromCollateralPool,
    setWithdrawFromCollateralPool,
    withdrawFromSailPool,
    setWithdrawFromSailPool,
    withdrawalMethods,
    setWithdrawalMethods,
    earlyWithdraw1PctEnabled,
    setEarlyWithdraw1PctEnabled,
    transactionSteps,
    setTransactionSteps,
    selectedPositions,
    setSelectedPositions,
    hasInitializedWithdraw,
    withdrawPoolUserSelectedMarketRef,
    positionAmounts,
    setPositionAmounts,
    withdrawPoolCollateralTab,
    setWithdrawPoolCollateralTab,
    withdrawPoolTypeTab,
    setWithdrawPoolTypeTab,
    withdrawPoolTabUserSelectedRef,
    withdrawPoolTypeTabUserSelectedRef,
    selectedDepositAsset,
    setSelectedDepositAsset,
    isPermitCapable,
    disableReason,
    handlePermitOrApproval,
    permitEnabled,
    setPermitEnabled,
    selectedStabilityPool,
    setSelectedStabilityPool,
    selectedMarketId,
    setSelectedMarketId,
    selectedRewardToken,
    setSelectedRewardToken,
    flowPage,
    setFlowPage,
    configureSellFromWalletTab,
    progressSteps,
    currentProgressIndex,
    handleProgressClose,
    showProgressModal,
    handleProgressRetry,
    selectedRedeemAsset,
    setSelectedRedeemAsset,
    selectedRedeemMarketId,
    setSelectedRedeemMarketId,
    redeemMarketSelectionMode,
    setRedeemMarketSelectionMode,
    publicClient,
    marketsForToken,
    groupedPoolPositions,
    selectedMarketHasPoolDeposit,
    marketIdWithAnyPoolDeposit,
    groupBalanceContracts,
    groupBalanceIndexMap,
    groupOnchainBalances,
    marketIdWithAnyOnchainPoolDeposit,
    selectedMarketHasOnchainPoolDeposit,
    selectedMarket,
    minterAddress,
    collateralAddress,
    peggedTokenAddress,
    leveragedTokenAddress,
    collateralSymbol,
    peggedTokenSymbol,
    acceptedDepositAssets,
    anyTokenDeposit,
    pegTargetPrices,
    btcPrice,
    ethPrice,
    eurPrice,
    fxSAVEPrice,
    wstETHPrice,
    stETHPrice,
    marketForDepositAsset,
    activeMarketForFees,
    activeMinterAddress,
    activeCollateralSymbol,
    activeWrappedCollateralSymbol,
    allDepositAssetsWithMarkets,
    allDepositAssets,
    depositAssetsForDropdown,
    depositAssetChoiceCount,
    useDepositCollateralSegment,
    depositAssetSegmentOptions,
    marketFeeContracts,
    marketFeeData,
    marketFeesMap,
    feeRange,
    redeemMarketFeeContracts,
    redeemMarketFeeData,
    redeemMarketFeesMap,
    sellFeeRange,
    allStabilityPools,
    isValidMinterAddress,
    stabilityPoolAddress,
    isDirectPeggedDeposit,
    genesisPeggedTokenAddress,
    getSelectedAssetAddress,
    isSelectedAssetNativeETH,
    nativeBalanceData,
    useAnvilForBalance,
    selectedAssetAddress,
    anvilSelectedAssetResult,
    wagmiSelectedAssetResult,
    wagmiSelectedAssetBalanceEnabled,
    selectedAssetBalanceData,
    selectedAssetBalanceError,
    selectedAssetBalanceLoading,
    collateralBalanceData,
    peggedTokenAddressForBalance,
    anvilBalanceResult,
    wagmiBalanceResult,
    directPeggedBalanceData,
    directPeggedBalanceError,
    directPeggedBalanceLoading,
    useAnvilForPeggedBalance,
    anvilPeggedBalanceResult,
    wagmiPeggedBalanceResult,
    peggedBalanceData,
    collateralPoolAddress,
    sailPoolAddress,
    collateralPoolTotalSupply,
    collateralPoolMinTotalSupply,
    sailPoolTotalSupply,
    sailPoolMinTotalSupply,
    anvilCollateralPoolResult,
    wagmiCollateralPoolResult,
    collateralPoolBalanceData,
    anvilSailPoolResult,
    wagmiSailPoolResult,
    sailPoolBalanceData,
    anvilCollateralPoolFeeResult,
    wagmiCollateralPoolFeeResult,
    collateralPoolEarlyFee,
    anvilSailPoolFeeResult,
    wagmiSailPoolFeeResult,
    sailPoolEarlyFee,
    anvilCollateralWindowResult,
    wagmiCollateralWindowResult,
    collateralPoolWindow,
    anvilSailWindowResult,
    wagmiSailWindowResult,
    sailPoolWindow,
    anvilCollateralRequestResult,
    wagmiCollateralRequestResult,
    collateralPoolRequest,
    anvilSailRequestResult,
    wagmiSailRequestResult,
    sailPoolRequest,
    formatDuration,
    getFeeFreeDisplay,
    getRequestStatusText,
    formatTime,
    getWindowBannerInfo,
    collateralPoolFeePercent,
    sailPoolFeePercent,
    isWindowOpen,
    earlyWithdrawalFees,
    showEarlyWithdrawalFees,
    selectedPoolEarlyWithdrawFee,
    currentDepositData,
    minterAddressForPrice,
    pegTargetForPrice,
    pegTargetUsdWei,
    isValidMinterAddressForPrice,
    peggedTokenPrice,
    poolContracts,
    allPoolData,
    isPoolDataLoading,
    poolsWithData,
    rewardTokenUsdPriceMap,
    rewardDataMeta,
    rewardDataReads,
    isRewardDataLoading,
    poolAprFallbackByAddress,
    poolsWithAprFallback,
    rewardTokenAddresses,
    rewardTokenSymbols,
    rewardTokenSymbolMap,
    poolsWithSymbols,
    rewardTokenOptions,
    skipRewardStep,
    filteredPools,
    isValidStabilityPoolAddress,
    wrappedForAdvancedApr,
    advAprWrappedOk,
    advancedStabilityPoolAprReadsEnabled,
    advancedStabilityPoolAprReads,
    formatAPR,
    stabilityPoolAPR,
    allowanceData,
    refetchAllowance,
    useAnvilForPeggedAllowance,
    anvilPeggedTokenAllowanceData,
    refetchAnvilPeggedTokenAllowance,
    wagmiPeggedTokenAllowanceData,
    refetchWagmiPeggedTokenAllowance,
    peggedTokenAllowanceData,
    refetchPeggedTokenAllowance,
    shouldUseAnvilHook,
    depositAmountInWrappedCollateral,
    wstETHAddressForConversion,
    ethOrStethAmount,
    wstETHAmountFromContract,
    accurateDepositAmountInWrappedCollateral,
    anvilExpectedMintOutput,
    regularExpectedMintOutput,
    rawExpectedMintOutput,
    swappedAmountForDryRun,
    swapDryRunOutput,
    selectedRedeemMarket,
    redeemCollateralSymbol,
    redeemMinterAddress,
    isValidRedeemMinterAddress,
    redeemAllowancePeggedTokenAddress,
    redeemAllowanceMinterAddress,
    peggedTokenMinterAllowanceData,
    refetchPeggedTokenMinterAllowance,
    redeemInputAmount,
    redeemDryRunAddress,
    redeemDryRunEnabled,
    anvilRedeemDryRunData,
    anvilRedeemDryRunError,
    regularRedeemDryRunData,
    regularRedeemDryRunError,
    redeemDryRunData,
    redeemDryRunError,
    redeemDryRunLoading,
    redeemDryRun,
    redeemPreview,
    redeemMarketPreviewContracts,
    redeemMarketPreviewIndexMap,
    redeemMarketPreviewReads,
    redeemMarketPreviews,
    recommendedRedeemMarketId,
    isCrossMarketRedeem,
    showWithdrawRedemptionCapNotice,
    showWithdrawCrossMarketNotice,
    withdrawNotificationCount,
    depositNotificationCount,
    anchorModalNotificationCount,
    anchorModalNotificationSeverities,
    anchorModalNotificationsBody,
    depositFlowParts,
    simpleDepositFlowParts,
    simpleWithdrawFlowParts,
    simpleSellFlowParts,
    poolSellAmountWei,
    hasPoolSellAmount,
    withdrawOverviewSteps,
    enableRedeemView,
    expectedRedeemOutput,
    redeemFeePercentage,
    feeMinterAddress,
    isValidFeeMinterAddress,
    parsedAmount,
    dryRunEnabled,
    amountForFeeDryRun,
    anvilDryRunData,
    anvilDryRunError,
    regularDryRunData,
    regularDryRunError,
    dryRunData,
    dryRunError,
    expectedMintOutput,
    stabilityPoolMarket,
    stabilityPoolMinterAddress,
    isValidStabilityPoolMinter,
    collateralRatioData,
    minterConfigData,
    minCollateralRatio,
    formatCollateralRatio,
    feePercentage,
    depositLimitWarning,
    setDepositLimitWarning,
    tempMaxWarning,
    setTempMaxWarning,
    tempWarningTimerRef,
    lastAdjustedAmountRef,
    resetSimpleDepositFlowKeepToken,
    handleBuyFlowModeChange,
    handleWithdrawFlowModeChange,
    handleRedeemFlowModeChange,
    handleTopTabChange,
    redeemFlowMode,
    leaveRewardTokenStepToAmount,
    goToFlowPage,
    handleDepositFlowStepClick,
    handleWithdrawFlowStepClick,
    handleDepositFlowBack,
    handleWithdrawFlowBack,
    clearWithdrawPoolSelectionAndInputs,
    selectWithdrawPoolRow,
    calculateMaxSwapAmount,
    originalWriteContractAsync,
    originalSendTransactionAsync,
    writeContractAsync,
    sendTransactionAsync,
    collateralBalance,
    peggedTokenAddressLower,
    subgraphHaBalance,
    peggedBalanceFromSubgraph,
    peggedBalanceContract,
    peggedBalance,
    canSellFromWallet,
    directPeggedBalance,
    selectedAssetBalance,
    selectedAssetSymbol,
    collateralPoolBalanceContract,
    sailPoolBalanceContract,
    collateralPoolAddressLower,
    sailPoolAddressLower,
    subgraphCollateralDeposit,
    subgraphSailDeposit,
    collateralPoolBalance,
    sailPoolBalance,
    withdrawPoolRowsForActiveRail,
    activeWithdrawPoolRow,
    collateralPoolImmediateCap,
    sailPoolImmediateCap,
    totalStabilityPoolBalance,
    allowance,
    peggedTokenAllowance,
    isUSDC,
    isFxUSD,
    isNativeETH,
    isStETH,
    isFxSAVE,
    isWstETH,
    depositAssetMarket,
    depositAssetCollateralSymbol,
    depositAssetWrappedCollateralSymbol,
    isWstETHMarket,
    isFxUSDMarket,
    isWrappedCollateral,
    zapAddress,
    useZapV1,
    ethZapAbi,
    zapSpAllowlistPending,
    useZap,
    useETHZap,
    useUSDCZap,
    showDepositPermitToggle,
    showRedeemPermitToggle,
    showPermitToggle,
    priceOracleAddress,
    fxSAVERate,
    amountBigInt,
    needsApproval,
    needsPeggedTokenApproval,
    currentDeposit,
    getAvailableBalance,
    peggedTokenPriceUsdWei,
    withdrawRedeemPriceInputs,
    currentDepositUSD,
    currentLedgerMarksPerDay,
    expectedDepositUSD,
    directPeggedDepositUSD,
    newTotalDepositUSD,
    newLedgerMarksPerDay,
    hasInitializedOnOpen,
    handleClose,
    handleCancel,
    handleBackToWithdrawInput,
    handleTabChange,
    handleMaxClick,
    handleAmountChange,
    handlePositionAmountChange,
    positionExceedsBalance,
    validateAmount,
    handleMint,
    handleDeposit,
    handleWithdrawMethodSelection,
    handleWithdrawExecution,
    handleRedeem,
    handleAction,
    handleContinueStep1,
    step1PrimaryAction,
    handleContinueDepositPage,
    hasValidWithdrawSelection,
    handleContinueToSell,
    handleSellRedeemSourceChange,
    handleSellMarketSelectChange,
    depositPagePrimaryAction,
    withdrawPage1PrimaryAction,
    withdrawPrimaryAction,
    depositTokenPriceUSD,
    showDepositBuyOverview,
    depositBuyOverview,
    buyFeeFooter,
    withdrawFeeFooter,
    withdrawTransactionOverview,
    getButtonText,
    isButtonDisabled,
    isProcessing,
    balance,
    balanceSymbol,
    expectedOutput,
    outputSymbol,
    hasRequestWithdrawals,
    isOpen,
    onClose,
    embedded,
    marketId,
    market,
    initialTab,
    onSuccess,
    simpleMode,
    bestPoolType,
    allMarkets,
    initialDepositAsset,
    positionsMap,
    shouldRender  } = props;

  return (
    <>
      {/* Progress Modal for transaction feedback — portaled center-screen */}
      {showProgressModal && (
        <TransactionProgressModal
          isOpen={showProgressModal}
          onClose={handleProgressClose}
          title={progressConfig.title || "Processing Transaction"}
          steps={progressSteps}
          currentStepIndex={currentProgressIndex}
          progressVariant="horizontal"
          canCancel={false}
          errorMessage={
            error || undefined
          }
          onRetry={
            shouldShowNetworkSwitch || (error?.toLowerCase().includes("switch") || error?.toLowerCase().includes("mainnet"))
              ? handleSwitchNetwork
              : handleProgressRetry
          }
          retryButtonLabel={
            shouldShowNetworkSwitch || (error?.toLowerCase().includes("switch") || error?.toLowerCase().includes("mainnet"))
              ? "Switch Network"
              : "Try Again"
          }
        />
      )}

      {/* Keep embedded panel mounted during progress so layout does not jump. */}
      {(isOpen || embedded) && (!showProgressModal || embedded) && (
        <DepositModalShell
          variant={embedded ? "inline" : "modal"}
          isOpen={isOpen || embedded}
          onClose={handleClose}
          title={
            <DepositModalTitle
              protocolName="Anchor"
              tokenSymbol={
                (selectedMarket || market)?.peggedToken?.symbol ||
                peggedTokenSymbol
              }
              tokenIcon={
                (selectedMarket || market)?.peggedToken?.icon as
                  | string
                  | undefined
              }
              actionLabel={
                activeTab === "deposit"
                  ? "Mint"
                  : activeTab === "withdraw"
                    ? "Withdraw"
                    : "Redeem"
              }
            />
          }
          notifications={{
            expanded: showNotifications,
            onToggle: () => setShowNotifications((prev) => !prev),
            count: anchorModalNotificationCount,
            badgeSeverities: anchorModalNotificationSeverities,
            children: anchorModalNotificationsBody,
          }}
          tabs={
            <DepositModalTabHeader
              tabs={[
                { value: "mint", label: "Mint" },
                { value: "redeem", label: "Redeem" },
              ]}
              activeTab={activeTab === "deposit" ? "mint" : "redeem"}
              onTabChange={(v) => handleTopTabChange(v as "mint" | "redeem")}
              disabled={isProcessing}
              tabDisabled={{
                mint: depositsBlocked,
              }}
            />
          }
          closeDisabled={isProcessing}
          closeTitle={isProcessing ? "Close modal (will cancel transaction)" : "Close"}
          panelClassName={
            embedded
              ? "flex h-full min-h-0 flex-col overflow-hidden"
              : undefined
          }
          contentClassName={
            embedded ? DEPOSIT_EMBEDDED_CONTENT_CLASS : undefined
          }
        >
            {simpleMode ? (
              <DepositModalLayout
                flowOverview={
                  activeTab === "deposit" ? (
                    <DepositModalFlowOverview
                      parts={simpleDepositFlowParts}
                      activeIndex={flowPage - 1}
                      onStepClick={handleDepositFlowStepClick}
                      onBack={handleDepositFlowBack}
                    />
                  ) : (
                    <DepositModalFlowOverview
                      parts={
                        activeTab === "sell"
                          ? simpleSellFlowParts
                          : simpleWithdrawFlowParts
                      }
                      activeIndex={activeTab === "sell" ? 0 : flowPage - 1}
                      onStepClick={
                        activeTab === "sell"
                          ? undefined
                          : handleWithdrawFlowStepClick
                      }
                      onBack={
                        activeTab === "sell"
                          ? undefined
                          : handleWithdrawFlowBack
                      }
                    />
                  )
                }
                scroll={
                  <>
                    <div
                      className={
                        activeTab === "deposit" && flowPage === 1
                          ? undefined
                          : "hidden"
                      }
                      aria-hidden={activeTab !== "deposit" || flowPage !== 1}
                    >
                    {!isDirectPeggedDeposit || useDepositCollateralSegment ? (
                      <div className={DEPOSIT_SEGMENT_STACK_CLASS}>
                    {!isDirectPeggedDeposit ? (
                      <div
                        className={DEPOSIT_SEGMENT_TRACK_CLASS}
                        role="tablist"
                        aria-label="Mint flow"
                      >
                        {(
                          [
                            { id: "deposit" as const, label: "Deposit" },
                            { id: "mintOnly" as const, label: "Mint" },
                          ] as const
                        ).map(({ id, label }) => {
                          const active = id === "mintOnly" ? mintOnly : !mintOnly;
                          return (
                            <button
                              key={id}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              disabled={isProcessing}
                              onClick={() => handleBuyFlowModeChange(id)}
                              className={`flex flex-1 items-center justify-center rounded-md py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                active
                                  ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                  : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {useDepositCollateralSegment ? (
                      <div
                        className={DEPOSIT_SEGMENT_TRACK_CLASS}
                        role="tablist"
                        aria-label="Pay with"
                      >
                        {depositAssetSegmentOptions.map((symbol) => {
                          const active =
                            selectedDepositAsset?.toUpperCase() ===
                            symbol.toUpperCase();
                          return (
                            <button
                              key={symbol}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              disabled={isProcessing}
                              onClick={() => {
                                if (active) return;
                                setSelectedDepositAsset(symbol);
                                anyTokenDeposit.setSelectedAsset(symbol);
                                resetSimpleDepositFlowKeepToken();
                              }}
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                active
                                  ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                  : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                              }`}
                            >
                              <TokenLogo symbol={symbol} size={16} />
                              {symbol}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                      </div>
                    ) : null}

                    <DepositAmountCard
                      showTokenSelector={!useDepositCollateralSegment}
                      tokenSelector={{
                        value: selectedDepositAsset ?? "",
                        onChange: (newAsset) => {
                          setSelectedDepositAsset(newAsset);
                          anyTokenDeposit.setSelectedAsset(newAsset);
                          resetSimpleDepositFlowKeepToken();
                        },
                        options: buildDepositTokenDropdownGroups({
                          supportedAssets: depositAssetsForDropdown.filter(
                            (asset) => !asset.isUserToken,
                          ),
                          swapAssets: depositAssetsForDropdown.filter(
                            (asset) => asset.isUserToken,
                          ),
                          collateralOnly: isCollateralOnlyChain,
                          isMegaEth,
                          nativeTokenLabel,
                        }),
                        placeholder: "Select token",
                        disabled: isProcessing,
                      }}
                      betweenTokenAndAmount={
                        <>
                        {!isCollateralOnlyChain && anyTokenDeposit.needsSwap && selectedDepositAsset && amount && parseFloat(amount) > 0 && (() => {
                          const isSwappingToUSDC = anyTokenDeposit.swapTargetToken !== "ETH";
                          const targetToken = isSwappingToUSDC ? "USDC" : nativeTokenLabel;
                          const targetDecimals = isSwappingToUSDC ? 2 : 6;
                          
                          // ParaSwap returns toAmount in smallest units, need to convert to decimal
                          const toAmountDecimals = isSwappingToUSDC ? 6 : 18; // USDC=6, ETH=18
                          const toAmountFormatted = anyTokenDeposit.swapQuote 
                            ? (parseFloat(anyTokenDeposit.swapQuote.toAmount) / (10 ** toAmountDecimals)).toFixed(targetDecimals)
                            : "0";
                          
                          return (
                            <div className="mt-2 text-xs text-[#1E4775]/50 italic">
                              {anyTokenDeposit.isLoadingSwapQuote ? (
                                <>{parseFloat(amount).toFixed(6)} {selectedDepositAsset} → Calculating swap... → {activeWrappedCollateralSymbol}</>
                              ) : anyTokenDeposit.swapQuote ? (
                                <>{parseFloat(amount).toFixed(6)} {selectedDepositAsset} → {toAmountFormatted} {targetToken} → {activeWrappedCollateralSymbol}</>
                              ) : null}
                            </div>
                          );
                        })()}
                        {isDirectPeggedDeposit && (
                          <p className="mt-2 text-xs text-[#1E4775]/60 flex items-center gap-1">
                            <span>ℹ️</span>
                            <span>Depositing {marketForDepositAsset?.peggedToken?.symbol || "ha"} directly to stability pool. No minting required.</span>
                          </p>
                        )}
                        </>
                      }
                      amount={{
                        value: amount,
                        setValue: (v) => { setAmount(v); anyTokenDeposit.setAmount(v); },
                        balance: (simpleMode && selectedAssetBalance != null) ? selectedAssetBalance : (selectedAssetBalance ?? collateralBalance ?? 0n),
                        decimals: isUSDC ? 6 : 18,
                        label: "Enter Amount",
                        disabled: isProcessing,
                        error,
                        capAtBalance: true,
                        onErrorClear: () => setError(null),
                        balanceSymbol: selectedDepositAsset || activeCollateralSymbol,
                        balanceMaxDecimals: 6,
                        amountInputOverlay: (
                          <div className="absolute right-20 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                            {tempMaxWarning ? (
                              <div className="px-2.5 py-1 text-xs bg-[#FF8A7A]/90 border border-[#FF8A7A] text-white font-semibold whitespace-nowrap shadow-lg animate-pulse-once">
                                ⚠️ {tempMaxWarning}
                              </div>
                            ) : (
                              <div className="px-2.5 py-1 text-xs invisible whitespace-nowrap">⚠️ Max: 0.0000</div>
                            )}
                          </div>
                        ),
                        customHandleMax: handleMaxClick,
                        customHandleChange: handleAmountChange,
                      }}
                      afterAmount={
                        showPermitToggle ? (
                          <DepositPermitToggle
                            mode={
                              showDepositPermitToggle ? "deposit" : "redemption"
                            }
                            enabled={permitEnabled}
                            onToggle={() => setPermitEnabled((prev) => !prev)}
                            disabled={isProcessing}
                            disableReason={disableReason}
                          />
                        ) : null
                      }
                    />
                    {/* Swap Preview - show when using any token deposit (always visible when swap asset is selected) */}
                      {anyTokenDeposit.needsSwap && (() => {
                        const targetToken = anyTokenDeposit.swapTargetToken === "ETH" ? "ETH" : "USDC";
                        const targetDecimals = targetToken === "USDC" ? 6 : 18;
                        const toAmountFormatted = anyTokenDeposit.swapQuote && anyTokenDeposit.swapQuote.toAmount > 0n
                          ? Number(anyTokenDeposit.swapQuote.toAmount) / (10 ** targetDecimals)
                          : 0;
                        
                        return (
                          <div className="p-2 bg-blue-50 border border-blue-200 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">Swap via ParaSwap:</span>
                              <span className="font-mono text-blue-900">
                                {toAmountFormatted > 0 
                                  ? `${toAmountFormatted.toFixed(targetDecimals === 6 ? 2 : 6)} ${targetToken}`
                                  : `0.${'0'.repeat(targetDecimals === 6 ? 2 : 6)} ${targetToken}`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">Slippage Tolerance:</span>
                              {showSlippageInput ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={slippageInputValue}
                                    onChange={(e) => {
                                      const input = e.target.value;
                                      // Allow empty, numbers, and decimal point
                                      if (input === "" || /^\d*\.?\d*$/.test(input)) {
                                        setSlippageInputValue(input);
                                      }
                                    }}
                                    onBlur={() => {
                                      const val = parseFloat(slippageInputValue);
                                      if (!isNaN(val) && val >= 0.1 && val <= 50) {
                                        setSlippageTolerance(val);
                                      } else {
                                        // Reset to current valid value if invalid
                                        setSlippageInputValue(slippageTolerance.toFixed(1));
                                      }
                                      setShowSlippageInput(false);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = parseFloat(slippageInputValue);
                                        if (!isNaN(val) && val >= 0.1 && val <= 50) {
                                          setSlippageTolerance(val);
                                        } else {
                                          setSlippageInputValue(slippageTolerance.toFixed(1));
                                        }
                                        setShowSlippageInput(false);
                                      } else if (e.key === 'Escape') {
                                        setSlippageInputValue(slippageTolerance.toFixed(1));
                                        setShowSlippageInput(false);
                                      }
                                    }}
                                    autoFocus
                                    className="w-16 px-1 py-0.5 text-right font-mono text-blue-900 border border-blue-300 focus:outline-none focus:border-blue-500"
                                  />
                                  <span className="text-blue-900">%</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSlippageInputValue(slippageTolerance.toFixed(1));
                                    setShowSlippageInput(true);
                                  }}
                                  className="font-mono text-blue-900 hover:text-blue-600 underline decoration-dotted cursor-pointer"
                                >
                                  {slippageTolerance.toFixed(1)}%
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">ParaSwap Fee:</span>
                              <span className="font-mono text-blue-700">
                                {anyTokenDeposit.swapQuote?.fee ? anyTokenDeposit.swapQuote.fee.toFixed(2) : "0.00"}%
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <ReservedErrorSlot message={error} />
                    </div>

                {/* Page 2: Deposit — reward token + stability pool */}
                {!mintOnly ? (
                <div
                  className={
                    activeTab === "deposit" && flowPage === 2
                      ? undefined
                      : "hidden"
                  }
                  aria-hidden={activeTab !== "deposit" || flowPage !== 2}
                >
                      {!skipRewardStep && rewardTokenOptions.length > 1 ? (
                        <div className={ANCHOR_MODAL_CARD_STACK}>
                          <div
                            className={DEPOSIT_SEGMENT_TRACK_CLASS}
                            role="tablist"
                            aria-label="Reward token"
                          >
                            {rewardTokenOptions.map(({ token, maxAPR }) => {
                              const active = selectedRewardToken === token;
                              return (
                                <button
                                  key={token}
                                  type="button"
                                  role="tab"
                                  aria-selected={active}
                                  disabled={isProcessing}
                                  onClick={() => {
                                    setSelectedRewardToken(token);
                                    setSelectedStabilityPool(null);
                                    setDepositInStabilityPool(false);
                                  }}
                                  className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-2 text-xs font-semibold transition disabled:opacity-50 ${
                                    active
                                      ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                      : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <TokenLogo symbol={token} size={16} />
                                    {token}
                                  </span>
                                  {maxAPR !== undefined && !isNaN(maxAPR) ? (
                                    <span className="text-[10px] font-normal tabular-nums">
                                      up to {formatAPR(maxAPR)} APR
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                          {selectedRewardToken ? (
                            <p className="text-center text-[11px] leading-snug text-[#1E4775]/65">
                              Max APR for {selectedRewardToken}:{" "}
                              <span className="font-semibold tabular-nums text-[#1E4775]">
                                {(() => {
                                  const opt = rewardTokenOptions.find(
                                    (o) => o.token === selectedRewardToken,
                                  );
                                  return opt?.maxAPR !== undefined &&
                                    !isNaN(opt.maxAPR)
                                    ? formatAPR(opt.maxAPR)
                                    : "—";
                                })()}
                              </span>
                            </p>
                          ) : (
                            <p className="text-center text-[11px] text-[#1E4775]/50">
                              Select a reward token to see pool options
                            </p>
                          )}
                        </div>
                      ) : null}
                      {zapSpAllowlistPending && useZap && (
                        <InfoCallout variant="info">
                          Stability pool zap deposits are temporarily unavailable for
                          this market while pool allowlists are finalized. You can
                          still mint to your wallet and deposit to a pool in a
                          separate step.
                        </InfoCallout>
                      )}
                      {selectedRewardToken || isDirectPeggedDeposit ? (
                        <div className={ANCHOR_MODAL_CARD_STACK}>
                          <DepositStabilityPoolCard
                            pools={filteredPools.map((pool) => ({
                              marketId: pool.marketId,
                              marketName: pool.marketName,
                              poolType: pool.poolType,
                              apr: pool.apr,
                              tvl: pool.tvl,
                              rewardTokens: pool.rewardTokens,
                            }))}
                            selected={selectedStabilityPool}
                            onSelect={(pool) => {
                              const prev = selectedStabilityPool;
                              const isNewPool =
                                !prev ||
                                prev.marketId !== pool.marketId ||
                                prev.poolType !== pool.poolType;
                              setSelectedStabilityPool(pool);
                              setDepositInStabilityPool(true);
                              setStabilityPoolType(pool.poolType);
                              if (isNewPool) {
                                setStep("input");
                                setError(null);
                                setTxHash(null);
                                setTxHashes({});
                                progress.reset();
                                setProgressConfig({
                                  ...defaultProgressConfig,
                                });
                              }
                            }}
                            disabled={isProcessing}
                            showMarketName={marketsForToken.length > 1}
                            peggedTokenPrice={
                              peggedTokenPrice as bigint | undefined
                            }
                            pegTargetUsdWei={pegTargetUsdWei}
                            isPoolDataLoading={isPoolDataLoading}
                            isRewardDataLoading={isRewardDataLoading}
                            emptyMessage={
                              isDirectPeggedDeposit
                                ? "No stability pools available for this market."
                                : `No pools found with ${selectedRewardToken} rewards. Please select a different reward token.`
                            }
                          />

                        {/* Deposit Limit Warning */}
                        {depositLimitWarning && (
                          <div className="mt-2 p-2 border text-xs bg-yellow-50 border-yellow-300 text-yellow-800">
                            <div className="font-semibold mb-1">ℹ️ Deposit amount adjusted</div>
                            <div>{depositLimitWarning}</div>
                          </div>
                        )}

                        {/* Fee Warning */}
                        {!depositLimitWarning && feePercentage !== undefined && feePercentage > 2 && (
                          <div className={`mt-2 p-2 border text-xs ${
                            feePercentage > 50
                              ? "bg-red-100 border-red-400 text-red-800" 
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            {feePercentage > 50 ? (
                              <>
                                <div className="font-semibold mb-1">🚫 Deposit amount too large</div>
                                <div>
                                  This deposit would bring the collateral ratio too low, resulting in a {feePercentage.toFixed(1)}% fee. 
                                  Please reduce your deposit amount to continue.
                                </div>
                              </>
                            ) : (
                              <>
                                ⚠️ High fee warning: Fees above 2% may significantly impact your returns
                              </>
                            )}
                          </div>
                        )}

                        {/* Reserved so reject state does not grow the panel */}
                        <ReservedErrorSlot message={error} className="mt-3" />
                      </div>
                    ) : (
                      <div className={ANCHOR_MODAL_CARD_STACK}>
                        <ReservedErrorSlot message={error} className="mt-2" />
                      </div>
                    )}
                </div>
                ) : null}

                    <div
                      className={
                        (activeTab === "withdraw" || activeTab === "sell") &&
                        (step === "input" || step === "error")
                          ? undefined
                          : "hidden"
                      }
                      aria-hidden={
                        !(
                          (activeTab === "withdraw" || activeTab === "sell") &&
                          (step === "input" || step === "error")
                        )
                      }
                    >
                    {simpleMode && (activeTab === "withdraw" || activeTab === "sell") ? (
                    <div className={DEPOSIT_SEGMENT_STACK_CLASS}>
                      <div
                        className={DEPOSIT_SEGMENT_TRACK_CLASS}
                        role="tablist"
                        aria-label="Redeem flow"
                      >
                        {(
                          [
                            {
                              id: "withdrawAndRedeem" as const,
                              label: "Withdraw & Redeem",
                            },
                            {
                              id: "withdrawOnly" as const,
                              label: "Withdraw",
                            },
                            {
                              id: "redeemOnly" as const,
                              label: "Redeem",
                            },
                          ] as const
                        ).map(({ id, label }) => {
                          const active = redeemFlowMode === id;
                          const disabled =
                            isProcessing ||
                            (id === "redeemOnly" && !canSellFromWallet);
                          return (
                            <button
                              key={id}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              disabled={disabled}
                              onClick={() => handleRedeemFlowModeChange(id)}
                              className={`flex flex-1 basis-0 min-w-0 items-center justify-center rounded-md px-1 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs ${
                                active
                                  ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                  : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    ) : null}
                    {(simpleMode ? flowPage === 1 && activeTab === "withdraw" : activeTab === "withdraw") ? (
                    <div className={DEPOSIT_SEGMENT_STACK_CLASS}>
                    {/* Reward / collateral filter: fxSAVE vs wstETH (when both exist) */}
                    {(() => {
                      const poolRows = withdrawPoolRowsForActiveRail;
                      if (poolRows.length === 0) return null;

                      const collateralTypes = new Set(
                        groupedPoolPositions
                          .map((r) =>
                            (
                              r.market?.collateral?.symbol ||
                              r.market?.wrappedCollateralToken?.symbol ||
                              ""
                            ).trim(),
                          )
                          .filter(Boolean),
                      );
                      const hasMultipleCollateralTypes =
                        collateralTypes.has("fxSAVE") &&
                        collateralTypes.has("wstETH");

                      const renderPoolControls = (
                        p: (typeof poolRows)[0],
                      ) => {
                              const modeKey =
                                p.poolType === "collateral"
                                  ? "collateralPool"
                                  : "sailPool";
                              const isImmediate =
                                (p.poolType === "collateral"
                                  ? withdrawalMethods.collateralPool
                                  : withdrawalMethods.sailPool) === "immediate";
                              const request =
                                p.poolType === "collateral"
                                  ? collateralPoolRequest
                                  : sailPoolRequest;
                              const window =
                                p.poolType === "collateral"
                                  ? collateralPoolWindow
                                  : sailPoolWindow;
                              const feePercent =
                                p.poolType === "collateral"
                                  ? collateralPoolFeePercent
                                  : sailPoolFeePercent;
                              // Always cap from the same balance shown in the strip (positionsMap
                              // row). Global immediate caps can prefer subgraph/contract reads and
                              // diverge — that made MAX fill a higher amount than "Balance".
                              const globalImmediateCap =
                                p.poolType === "collateral"
                                  ? collateralPoolImmediateCap
                                  : sailPoolImmediateCap;
                              const rowImmediateCap =
                                p.marketId === selectedMarketId &&
                                globalImmediateCap < p.balance
                                  ? globalImmediateCap
                                  : p.balance;
                              const amountValue =
                                p.poolType === "collateral"
                                  ? positionAmounts.collateralPool
                                  : positionAmounts.sailPool;
                              const exceeds = (() => {
                                if (!amountValue) return false;
                                try {
                                  return (
                                    parseEther(amountValue) > rowImmediateCap
                                  );
                                } catch {
                                  return false;
                                }
                              })();

                              return (
                                    <div className="space-y-1.5">
                              {/* Withdrawal Method: Request (default) or Early Withdraw (1% fee, gated by toggle unless window open) */}
                              {(() => {
                                const poolWindowOpen = !!(request && request[0] > 0n && request[1] > 0n) && (() => {
                                  const [start, end] = request;
                                  const now = BigInt(Math.floor(Date.now() / 1000));
                                  return now >= start && now <= end;
                                })();
                                const showEarlyWithdrawOption = poolWindowOpen || earlyWithdraw1PctEnabled;
                                const show1PctToggle = !poolWindowOpen;
                                const immediateFeeDisplay = getFeeFreeDisplay(
                                  request,
                                  feePercent
                                );
                                const immediateWithdrawLabel =
                                  immediateFeeDisplay === "free"
                                    ? "Withdraw"
                                    : "Early Withdraw";
                                return (
                                  <>
                              <div className="flex items-center rounded-lg overflow-hidden bg-[#1E4775]/8 p-0.5 mb-1.5">
                                {showEarlyWithdrawOption && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setWithdrawalMethods((prev) => ({
                                      ...prev,
                                              [modeKey]: "immediate",
                                    }))
                                  }
                                  disabled={isProcessing}
                                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all rounded-md ${
                                            isImmediate
                                      ? "bg-[#1E4775] text-white shadow-sm"
                                      : "text-[#1E4775]/70 hover:text-[#1E4775]"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {immediateWithdrawLabel} ({immediateFeeDisplay})
                                </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setWithdrawalMethods((prev) => ({
                                      ...prev,
                                              [modeKey]: "request",
                                    }))
                                  }
                                  disabled={isProcessing}
                                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all rounded-md ${
                                            !isImmediate
                                      ? "bg-[#1E4775] text-white shadow-sm"
                                      : "text-[#1E4775]/70 hover:text-[#1E4775]"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                          Request Withdrawal
                                          {getRequestStatusText(request)}
                                </button>
                              </div>
                              {show1PctToggle && (
                                <div className="flex items-center justify-between rounded-lg border border-[#1E4775]/12 bg-white/60 px-2.5 py-1.5 text-[10px] mb-1.5">
                                  <span className="text-[#1E4775]/80">
                                    Pay 1% fee to withdraw immediately (no waiting)
                                  </span>
                                  <label className="flex items-center gap-1.5 text-[#1E4775]/80 shrink-0">
                                    <span className={earlyWithdraw1PctEnabled ? "text-[#1E4775]" : "text-[#1E4775]/60"}>
                                      {earlyWithdraw1PctEnabled ? "On" : "Off"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = !earlyWithdraw1PctEnabled;
                                        setEarlyWithdraw1PctEnabled(next);
                                        setWithdrawalMethods((m) => ({
                                          ...m,
                                          [modeKey]: next ? "immediate" : "request",
                                        }));
                                      }}
                                      disabled={isProcessing}
                                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                        earlyWithdraw1PctEnabled ? "bg-[#1E4775]" : "bg-[#1E4775]/30"
                                      }`}
                                      aria-pressed={earlyWithdraw1PctEnabled}
                                      aria-label="Enable 1% early withdraw"
                                    >
                                      <span
                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                          earlyWithdraw1PctEnabled ? "translate-x-3.5" : "translate-x-0.5"
                                        }`}
                                      />
                                    </button>
                                  </label>
                                </div>
                              )}
                                  </>
                                );
                              })()}

                                      {/* Window status banner */}
                                      {(() => {
                                        const bannerInfo =
                                          getWindowBannerInfo(request, window);
                                        if (!bannerInfo) return null;

                                        if (bannerInfo.type === "coming") {
                                          return (
                                            <div className="mt-2 px-3 py-2 rounded-lg bg-[#FF8A7A]/20 border border-[#FF8A7A]/40 text-[10px] text-[#FF8A7A] font-medium">
                                              {bannerInfo.message}
                                            </div>
                                          );
                                        }
                                        if (bannerInfo.type === "open") {
                                          return (
                                            <div className="mt-2 px-3 py-2 rounded-lg bg-[#7FD4C0]/20 border border-[#7FD4C0]/40 text-[10px] text-[#7FD4C0] font-medium">
                                              {bannerInfo.message}
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}

                              {/* Amount input - only show for immediate withdrawals */}
                                      {isImmediate && (
                                <div className="mt-1.5">
                                  <div className="relative">
                                  <input
                                    type="text"
                                            value={amountValue}
                                    onChange={(e) =>
                                      handlePositionAmountChange(
                                                modeKey as any,
                                        e.target.value,
                                                rowImmediateCap
                                      )
                                    }
                                    placeholder="0.0"
                                    className={depositAmountInputClass(exceeds)}
                                    disabled={isProcessing}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPositionAmounts((prev) => ({
                                        ...prev,
                                                [modeKey]: formatEther(
                                                  rowImmediateCap
                                        ),
                                      }));
                                    }}
                                    className={DEPOSIT_AMOUNT_MAX_BUTTON_CLASS}
                                            disabled={
                                              isProcessing || rowImmediateCap === 0n
                                            }
                                  >
                                    MAX
                                  </button>
                                  </div>
                                </div>
                              )}

                                      {isImmediate && rowImmediateCap === 0n && (
                                <p className="text-[10px] text-[#1E4775]/60 mt-1">
                                          Early withdraw is temporarily unavailable:
                                          the pool is at its minimum total supply.
                                          Use Request (free) or wait for TVL to
                                          increase.
                                        </p>
                                      )}

                                      {/* Info message for request method - only show if no window banner */}
                                      {!isImmediate &&
                                        !getWindowBannerInfo(request, window) && (
                                          <p className="text-[10px] text-[#1E4775]/60 mt-1">
                                            Submit a withdrawal request. After a{" "}
                                            {window
                                              ? formatDuration(window[0])
                                              : "..."}{" "}
                                            delay, you&apos;ll have a fee-free window of{" "}
                                            {window
                                              ? formatDuration(window[1])
                                              : "..."}{" "}
                                            to withdraw.
                                </p>
                          )}
                                    </div>
                              );
                      };

                      const poolCollateralTabs = (
                        ["fxSAVE", "wstETH"] as const
                      ).filter((sym) => collateralTypes.has(sym));

                      return (
                        <div className="space-y-0.5">
                          <div className={DEPOSIT_SEGMENT_STACK_CLASS}>
                          {hasMultipleCollateralTypes &&
                            poolCollateralTabs.length > 1 && (
                              <div
                                className={DEPOSIT_SEGMENT_TRACK_CLASS}
                                role="tablist"
                                aria-label="Pool collateral type"
                              >
                                {poolCollateralTabs.map((sym) => {
                                  const active =
                                    withdrawPoolCollateralTab === sym;
                                  return (
                                    <button
                                      key={sym}
                                      type="button"
                                      role="tab"
                                      aria-selected={active}
                                      disabled={isProcessing}
                                      onClick={() => {
                                        if (sym === withdrawPoolCollateralTab) return;
                                        withdrawPoolTabUserSelectedRef.current = true;
                                        withdrawPoolUserSelectedMarketRef.current = true;
                                        clearWithdrawPoolSelectionAndInputs();
                                        setWithdrawPoolCollateralTab(sym);
                                        setRedeemMarketSelectionMode("auto");
                                        const match = marketsForToken.find(
                                          ({ market: m }) =>
                                            (m?.collateral?.symbol ||
                                              m?.wrappedCollateralToken
                                                ?.symbol) === sym
                                        );
                                        if (match) {
                                          setSelectedMarketId(match.marketId);
                                          setSelectedRedeemMarketId(match.marketId);
                                          const redeemSym =
                                            match.market?.collateral?.symbol;
                                          if (redeemSym) {
                                            setSelectedRedeemAsset(redeemSym);
                                          }
                                        }
                                      }}
                                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                        active
                                          ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                          : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                                      }`}
                                    >
                                      <TokenLogo symbol={sym} size={16} />
                                      {sym}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          <div
                            className={DEPOSIT_SEGMENT_TRACK_CLASS}
                            role="tablist"
                            aria-label="Stability pool"
                          >
                            {(["collateral", "sail"] as const).map(
                              (poolType) => {
                                const row = poolRows.find(
                                  (r) => r.poolType === poolType,
                                );
                                const active =
                                  withdrawPoolTypeTab === poolType;
                                const label =
                                  poolType === "collateral"
                                    ? "Collateral"
                                    : "Sail";
                                return (
                                  <button
                                    key={poolType}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    disabled={isProcessing || !row}
                                    onClick={() => {
                                      if (poolType === withdrawPoolTypeTab)
                                        return;
                                      withdrawPoolTypeTabUserSelectedRef.current = true;
                                      setWithdrawPoolTypeTab(poolType);
                                      if (row) {
                                        selectWithdrawPoolRow(
                                          row,
                                          row.marketId !== selectedMarketId,
                                        );
                                      }
                                    }}
                                    className={`flex flex-1 basis-0 min-w-0 items-center justify-center gap-1.5 rounded-md py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                      active
                                        ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                        : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              },
                            )}
                          </div>
                          </div>
                          {activeWithdrawPoolRow ? (
                            <div className={`${DEPOSIT_AMOUNT_CARD_CLASS} space-y-1.5`}>
                              <DepositBalanceStrip
                                ariaLabel={`Pool ${peggedTokenSymbol} balance`}
                              >
                                {formatBalance(
                                  activeWithdrawPoolRow.balance,
                                  peggedTokenSymbol,
                                  6,
                                  18,
                                )}
                              </DepositBalanceStrip>
                              {activeWithdrawPoolRow.balance > 0n ? (
                                renderPoolControls(activeWithdrawPoolRow)
                              ) : (
                                <p className="text-center text-xs text-[#1E4775]/45 py-1">
                                  No position in this pool
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}

                    {activeTab === "withdraw" &&
                    collateralPoolBalance === 0n &&
                      sailPoolBalance === 0n && (
                      <div className="p-3 rounded-md bg-[#17395F]/5 border border-[#17395F]/20 text-center text-sm text-[#1E4775]/50">
                        No positions found
                      </div>
                    )}

                    </div>
                    ) : null}

                    {(simpleMode ? flowPage === 2 || activeTab === "sell" : true) ? (
                    <>
                    {(!withdrawOnly || activeTab === "sell") && (
                      <div className={`${DEPOSIT_AMOUNT_CARD_CLASS} space-y-2`}>
                        <div>
                          {activeTab !== "sell" ? (
                            <>
                          <div
                            className={DEPOSIT_SEGMENT_TRACK_CLASS}
                            role="tablist"
                            aria-label="Redeem source"
                          >
                            {hasPoolSellAmount ? (
                              <button
                                type="button"
                                role="tab"
                                aria-selected={
                                  (hasPoolSellAmount
                                    ? sellRedeemSource
                                    : "wallet") === "pool"
                                }
                                disabled={isProcessing}
                                onClick={() =>
                                  handleSellRedeemSourceChange("pool")
                                }
                                className={`flex flex-1 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                  (hasPoolSellAmount
                                    ? sellRedeemSource
                                    : "wallet") === "pool"
                                    ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                    : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                                }`}
                              >
                                Pool withdraw
                              </button>
                            ) : null}
                            <button
                              type="button"
                              role="tab"
                              aria-selected={
                                (hasPoolSellAmount
                                  ? sellRedeemSource
                                  : "wallet") === "wallet"
                              }
                              disabled={isProcessing || !canSellFromWallet}
                              onClick={() =>
                                handleSellRedeemSourceChange("wallet")
                              }
                              className={`flex flex-1 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                (hasPoolSellAmount
                                  ? sellRedeemSource
                                  : "wallet") === "wallet"
                                  ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                  : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                              }`}
                            >
                              Wallet
                            </button>
                          </div>
                            </>
                          ) : null}

                          {(activeTab === "sell" ||
                            (hasPoolSellAmount
                              ? sellRedeemSource
                              : "wallet") === "pool") &&
                          hasPoolSellAmount &&
                          activeTab !== "sell" ? (
                            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#1E4775]/12 bg-white/60 px-2.5 py-2">
                              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/50">
                                Amount to redeem
                              </span>
                              <span className="font-mono text-sm font-semibold tabular-nums text-[#1E4775]">
                                {formatTokenAmount18(poolSellAmountWei, 6)}{" "}
                                {peggedTokenSymbol}
                              </span>
                            </div>
                          ) : null}

                          {activeTab === "sell" ||
                          sellRedeemSource === "wallet" ||
                          !hasPoolSellAmount ? (
                            <div className="mt-2 space-y-2">
                              {activeTab === "sell" ? (
                                <div className={DEPOSIT_SECTION_LABEL_CLASS}>
                                  Redeem amount
                                </div>
                              ) : null}
                              <div className="relative">
                                <input
                                  id="sell-wallet-amount"
                                  type="text"
                                  aria-label="Wallet amount"
                                  value={positionAmounts.wallet}
                                  onChange={(e) =>
                                    handlePositionAmountChange(
                                      "wallet",
                                      e.target.value,
                                      peggedBalance,
                                    )
                                  }
                                  placeholder="0.0"
                                  className={depositAmountInputClass(
                                    positionExceedsBalance.wallet,
                                  )}
                                  disabled={isProcessing || !canSellFromWallet}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPositionAmounts((prev) => ({
                                      ...prev,
                                      wallet: formatEther(peggedBalance),
                                    }));
                                  }}
                                  className={DEPOSIT_AMOUNT_MAX_BUTTON_CLASS}
                                  disabled={isProcessing || !canSellFromWallet}
                                >
                                  MAX
                                </button>
                              </div>
                              <DepositBalanceStrip
                                ariaLabel={`Wallet ${peggedTokenSymbol} balance`}
                              >
                                {formatBalance(
                                  peggedBalance,
                                  peggedTokenSymbol,
                                  6,
                                  18,
                                )}
                              </DepositBalanceStrip>
                            </div>
                          ) : null}
                        </div>

                        {marketsForToken.length > 1 ? (
                          <div>
                            <div className={DEPOSIT_SECTION_LABEL_CLASS}>
                              Redeem via market
                            </div>
                            <div
                              className={`${DEPOSIT_SEGMENT_TRACK_CLASS} mt-1`}
                              role="tablist"
                              aria-label="Redeem via market"
                            >
                              <button
                                type="button"
                                role="tab"
                                aria-selected={
                                  redeemMarketSelectionMode === "auto"
                                }
                                disabled={isProcessing}
                                onClick={() =>
                                  setRedeemMarketSelectionMode("auto")
                                }
                                className={`flex flex-1 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                  redeemMarketSelectionMode === "auto"
                                    ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                    : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                                }`}
                              >
                                Auto
                              </button>
                              <button
                                type="button"
                                role="tab"
                                aria-selected={
                                  redeemMarketSelectionMode === "manual"
                                }
                                disabled={isProcessing}
                                onClick={() =>
                                  setRedeemMarketSelectionMode("manual")
                                }
                                className={`flex flex-1 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                  redeemMarketSelectionMode === "manual"
                                    ? "bg-white/90 backdrop-blur-sm text-[#1E4775] shadow-sm"
                                    : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                                }`}
                              >
                                Manual
                              </button>
                            </div>

                            {redeemMarketSelectionMode === "auto" ? (
                              <p className="mt-2 text-[11px] leading-snug text-[#1E4775]/65 px-0.5">
                                Best path ·{" "}
                                <span className="font-medium text-[#1E4775]">
                                  {marketsForToken.find(
                                    (m) =>
                                      m.marketId === recommendedRedeemMarketId,
                                  )?.market?.name ||
                                    selectedRedeemMarket?.market?.name ||
                                    "..."}
                                </span>
                                {" · "}
                                {redeemCollateralSymbol}
                              </p>
                            ) : (
                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {marketsForToken.map(
                                  ({ marketId: mid, market: m }) => {
                                    const preview =
                                      redeemMarketPreviews.get(mid);
                                    const collateralSym =
                                      m?.collateral?.symbol || "";
                                    const collateralKey =
                                      collateralSym.toLowerCase() === "fxsave"
                                        ? "fxSAVE"
                                        : collateralSym.toLowerCase() ===
                                            "wsteth"
                                          ? "wstETH"
                                          : collateralSym;
                                    const isSelected =
                                      (selectedRedeemMarketId ||
                                        selectedMarketId) === mid;
                                    const isCapped =
                                      preview?.isCapped ?? false;
                                    const isRecommended =
                                      recommendedRedeemMarketId === mid &&
                                      !isCapped;

                                    return (
                                      <button
                                        key={mid}
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() =>
                                          handleSellMarketSelectChange(mid)
                                        }
                                        className={`rounded-lg border px-2.5 py-2.5 text-left transition disabled:opacity-50 ${
                                          isSelected
                                            ? "border-[#1E4775] bg-[#17395F]/10 shadow-sm"
                                            : "border-[#1E4775]/15 bg-white/50 hover:bg-[#17395F]/5"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex min-w-0 items-center gap-2">
                                            <TokenIconClient
                                              symbol={collateralKey}
                                              size={20}
                                              className="shrink-0"
                                            />
                                            <div className="text-sm font-semibold text-[#1E4775]">
                                              {collateralKey}
                                            </div>
                                          </div>
                                          <div
                                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                                              isSelected
                                                ? "border-[#1E4775] bg-[#1E4775]"
                                                : "border-[#1E4775]/30"
                                            }`}
                                          />
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                          {isRecommended ? (
                                            <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-[#4A9784]/15 text-[#4A9784]">
                                              Recommended
                                            </span>
                                          ) : null}
                                          {isCapped ? (
                                            <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-amber-100 text-amber-800">
                                              Capped
                                            </span>
                                          ) : null}
                                        </div>
                                        {preview &&
                                        preview.wrappedOut > 0n &&
                                        redeemInputAmount &&
                                        redeemInputAmount > 0n ? (
                                          <div className="mt-1 font-mono text-[11px] text-[#1E4775]/70">
                                            ~{" "}
                                            {Number(
                                              formatEther(preview.wrappedOut),
                                            ).toFixed(4)}{" "}
                                            {collateralSym}
                                            {preview.isCapped
                                              ? " (partial)"
                                              : ""}
                                          </div>
                                        ) : null}
                                      </button>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {!simpleMode &&
                      peggedBalance === 0n &&
                      collateralPoolBalance === 0n &&
                      sailPoolBalance === 0n && (
                      <div className="p-3 rounded-md bg-[#17395F]/5 border border-[#17395F]/20 text-center text-sm text-[#1E4775]/50">
                        No positions found
                      </div>
                    )}

                    </>
                    ) : null}

                    {simpleMode && error ? (
                      <ErrorBanner message={error} className="mt-2" />
                    ) : null}
                    </div>
                  </>
                }
                overview={
                  activeTab === "deposit" ? (
                    <AnchorBuyTransactionOverview
                      {...(depositBuyOverview ?? {
                        receiveAmount: null,
                        receiveSymbol: peggedTokenSymbol,
                        emptyMessage:
                          "Enter an amount to see what you'll receive.",
                      })}
                    />
                  ) : (
                    <AnchorTransactionOverview
                      {...(withdrawTransactionOverview ?? {
                        receiveAmount: null,
                        receiveSymbol: peggedTokenSymbol,
                        emptyMessage:
                          "Enter an amount to see what you'll receive.",
                      })}
                    />
                  )
                }
                footer={
                  step === "success" ? null : (
                    <DepositActionFooter
                      layout={embedded ? "embedded" : "modal"}
                      action={
                        activeTab === "deposit"
                          ? flowPage === 1
                            ? step1PrimaryAction
                            : depositPagePrimaryAction
                          : activeTab === "sell" || flowPage === 2
                            ? withdrawPrimaryAction
                            : withdrawPage1PrimaryAction
                      }
                      onSubmit={
                        activeTab === "deposit"
                          ? flowPage === 1
                            ? handleContinueStep1
                            : handleContinueDepositPage
                          : activeTab === "sell" || flowPage === 2
                            ? handleAction
                            : withdrawOnly
                              ? handleAction
                              : handleContinueToSell
                      }
                      onRetry={
                        activeTab === "deposit"
                          ? flowPage === 1
                            ? handleContinueStep1
                            : handleContinueDepositPage
                          : activeTab === "sell" || flowPage === 2
                            ? handleAction
                            : withdrawOnly
                              ? handleAction
                              : handleContinueToSell
                      }
                      feeFooter={
                        activeTab === "deposit" ? buyFeeFooter : withdrawFeeFooter
                      }
                    />
                  )
                }
                footerDisabled={isProcessing}
              />
            ) : (
              <>
                {activeTab === "deposit" && (
                  <DepositModalFlowOverview parts={depositFlowParts} />
                )}

                {/* Transaction Status List */}
                {(step === "withdrawing" || step === "redeeming") &&
                  transactionSteps.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-[#1E4775] mb-3">
                        Transaction Status:
                      </div>
                      {transactionSteps.map((txStep) => (
                        <div
                          key={txStep.id}
                          className="p-3 rounded-md bg-[#17395F]/5 border border-[#17395F]/20"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {txStep.status === "pending" && (
                                <div className="w-4 h-4 border-2 border-[#1E4775]/30 rounded-full" />
                              )}
                              {txStep.status === "processing" && (
                                <div className="w-4 h-4 border-2 border-[#1E4775] border-t-transparent rounded-full animate-spin" />
                              )}
                              {txStep.status === "success" && (
                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}
                              {txStep.status === "error" && (
                                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </div>
                              )}
                              <span className="text-sm text-[#1E4775] font-medium">
                                {txStep.label}
                              </span>
                            </div>
                            {txStep.hash && (
                              <a
                                href={`https://etherscan.io/tx/${txStep.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#1E4775]/70 hover:text-[#1E4775] underline"
                              >
                                View
                              </a>
                            )}
                          </div>
                          {txStep.error && (
                            <div className="mt-2 text-xs text-red-600">
                              {txStep.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                    {/* Amount Input - Only for Deposit Tab */}
                {activeTab === "deposit" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#1E4775]/70">Amount</span>
                      <span className="text-[#1E4775]/70">
                        Balance: {formatEther(balance)}{" "}{balanceSymbol}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0.0"
                        className={`w-full px-3 pr-20 py-2 bg-white/85 backdrop-blur-sm text-[#1E4775] border ${
                          error ? "border-red-500" : "border-[#1E4775]/30"
                        } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-lg font-mono`}
                        disabled={isProcessing}
                      />
                      {/* Warning - always reserve space to prevent layout shift */}
                      <div className="absolute right-16 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                        {tempMaxWarning ? (
                          <div className="px-2.5 py-1 text-xs bg-[#FF8A7A]/90 border border-[#FF8A7A] text-white font-semibold whitespace-nowrap shadow-lg animate-pulse-once">
                            ⚠️ {tempMaxWarning}
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 text-xs invisible whitespace-nowrap">
                            {/* Invisible placeholder to reserve space */}
                            ⚠️ Max: 0.0000
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleMaxClick}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded-md bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500"
                        disabled={isProcessing}
                      >
                        MAX
                      </button>
                    </div>
                    <div className="text-right text-xs text-[#1E4775]/50">
                      {balanceSymbol}
                    </div>
                    
                    {/* Transaction Overview - Always show on first step of deposit tab */}
                    {activeTab === "deposit" && !simpleMode && (
                      <div className="mt-2 space-y-2">
                        <label className="block text-sm font-semibold text-[#1E4775] mb-1.5">
                          Transaction Overview
                        </label>
                        <div className="p-2.5 rounded-md bg-[#17395F]/5 border border-[#1E4775]/10">
                          <div className="space-y-2 text-sm">
                            {/* You will receive */}
                            {expectedOutput && amount && parseFloat(amount) > 0 ? (
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-[#1E4775]/70">
                                  You will receive:
                                </span>
                                <span className="text-xl font-bold text-[#1E4775] font-mono">
                                  {(() => {
                                    const outputAmount = Number(formatEther(expectedOutput));
                                    // For haETH, use ETH price directly; for other ha tokens, use pegged token price
                                    let usdValue = 0;
                                    if (outputSymbol.toLowerCase().includes("haeth")) {
                                      usdValue = outputAmount * (ethPrice || 0);
                                    } else {
                                      const peggedPriceUSD = peggedTokenPriceUsdWei > 0n
                                        ? Number(formatUnits(peggedTokenPriceUsdWei, 18))
                                        : 0;
                                      usdValue = outputAmount * peggedPriceUSD;
                                    }
                                    return `${outputAmount.toFixed(6)} ${outputSymbol}${usdValue > 0 ? ` ($${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ""}`;
                                  })()}
                                </span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-[#1E4775]/70">
                                  You will receive:
                                </span>
                                <span className="text-xl font-bold text-[#1E4775] font-mono">
                                  ...
                                </span>
                              </div>
                            )}
                            {/* Conversion: "X fxUSD ≈ Y haETH" — mint only */}
                            {expectedOutput && expectedOutput > 0n && amount && parseFloat(amount) > 0 && (
                              <div className="text-xs text-[#1E4775]/50 italic text-right">
                                ({parseFloat(amount).toFixed(6)} {selectedDepositAsset || collateralSymbol} ≈ {Number(formatEther(expectedOutput)).toFixed(6)} {outputSymbol})
                              </div>
                            )}
                            {/* Mint fee */}
                            {feePercentage !== undefined && amount && parseFloat(amount) > 0 && (
                              <>
                                {expectedOutput && <div className="border-t border-[#1E4775]/20"></div>}
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-[#1E4775]/70">
                                    Mint fee:
                                  </span>
                                  <span
                                    className={`font-bold font-mono ${
                                      feePercentage > 2
                                        ? "text-red-600"
                                        : "text-[#1E4775]"
                                    }`}
                                  >
                                    {(() => {
                                      const inputAmount = parseFloat(amount);
                                      const feeAmount = inputAmount * (feePercentage / 100);
                                      // Calculate deposit token price
                                      let depositTokenPriceUSD = 0;
                                      const assetLower = (selectedDepositAsset || collateralSymbol).toLowerCase();
                                      if (assetLower === "eth" || assetLower === "weth") {
                                        depositTokenPriceUSD = ethPrice || 0;
                                      } else if (assetLower === "wsteth" || assetLower === "steth") {
                                        depositTokenPriceUSD = wstETHPrice || 0;
                                      } else if (assetLower === "fxsave") {
                                        depositTokenPriceUSD = fxSAVEPrice || 0;
                                      } else if (assetLower === "usdc" || assetLower === "fxusd") {
                                        depositTokenPriceUSD = 1.0;
                                      }
                                      const feeUSD = feeAmount * depositTokenPriceUSD;
                                      const depositTokenSymbol = selectedDepositAsset || collateralSymbol;
                                      return (
                                        <>
                                          {feePercentage.toFixed(2)}% - {feeAmount > 0 ? `${feeAmount.toFixed(6)} ${depositTokenSymbol}` : "..."} ({feeUSD > 0 ? `$${feeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "..."})
                                          {feePercentage > 2 && " ⚠️"}
                                        </>
                                      );
                                    })()}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {expectedOutput &&
                      ((amount && parseFloat(amount) > 0) ||
                        (activeTab === "withdraw" &&
                          redeemInputAmount &&
                          redeemInputAmount > 0n)) &&
                      activeTab === "deposit" && !simpleMode && (
                        /* Regular simple mode display (non-first-step deposit or withdraw) */
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-[#1E4775]/70">
                              {simpleMode &&
                              activeTab === "deposit" &&
                              depositInStabilityPool
                                ? `You'll receive:`
                                : activeTab === "withdraw" && withdrawOnly
                                ? "You will receive (anchor tokens):"
                                : "You will receive:"}
                            </span>
                            <span className="text-lg font-bold text-[#1E4775] font-mono">
                              {(() => {
                                const outputAmount = Number(formatEther(expectedOutput));
                                // Calculate USD value
                                let usdValue = 0;
                                if (activeTab === "deposit") {
                                  // For deposit, use pegged token price in USD
                                  const peggedPriceUSD = peggedTokenPriceUsdWei > 0n
                                    ? Number(formatUnits(peggedTokenPriceUsdWei, 18))
                                    : 0;
                                  usdValue = outputAmount * peggedPriceUSD;
                                } else {
                                  // For withdraw, use collateral price
                                  const collateralLower = collateralSymbol.toLowerCase();
                                  let priceUSD = 0;
                                  if (collateralLower === "eth" || collateralLower === "weth") {
                                    priceUSD = ethPrice || 0;
                                  } else if (collateralLower === "wsteth" || collateralLower === "steth") {
                                    priceUSD = wstETHPrice || 0;
                                  } else if (collateralLower === "fxsave") {
                                    priceUSD = fxSAVEPrice || 0;
                                  } else if (collateralLower === "usdc" || collateralLower === "fxusd") {
                                    priceUSD = 1.0;
                                  }
                                  usdValue = outputAmount * priceUSD;
                                }
                                return `${outputAmount.toFixed(6)} ${outputSymbol}${usdValue > 0 ? ` ($${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ""}`;
                              })()}
                            </span>
                          </div>
                          {simpleMode &&
                            activeTab === "deposit" &&
                            depositInStabilityPool && (
                              <div className="text-xs text-[#1E4775]/60">
                                Deposited to:{" "}
                                {bestPoolType === "collateral"
                                  ? "Collateral"
                                  : "Sail"}
                                {" "}
                                pool (optimized for best yield)
                              </div>
                            )}
                        </div>
                      )}
                    {/* Fee Display - Advanced Mode (Deposit only - Withdraw uses dry-run box below) */}
                    {!simpleMode &&
                      activeTab === "deposit" &&
                      feePercentage !== undefined &&
                      amount &&
                      parseFloat(amount) > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#1E4775]/20">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#1E4775]/70">
                              Mint fee:
                            </span>
                            <span
                              className={`font-bold font-mono ${
                                feePercentage > 2
                                  ? "text-red-600"
                                  : "text-[#1E4775]"
                              }`}
                            >
                              {(() => {
                                // Calculate USD value of fee
                                const inputAmount = parseFloat(amount);
                                const feeAmount = inputAmount * (feePercentage / 100);
                                // Calculate deposit token price based on selected asset
                                let depositTokenPriceUSD = 0;
                                if (selectedDepositAsset) {
                                  const assetLower = selectedDepositAsset.toLowerCase();
                                  if (assetLower === "eth" || assetLower === "weth") {
                                    depositTokenPriceUSD = ethPrice || 0;
                                  } else if (assetLower === "wsteth" || assetLower === "steth") {
                                    depositTokenPriceUSD = wstETHPrice || 0;
                                  } else if (assetLower === "fxsave") {
                                    depositTokenPriceUSD = fxSAVEPrice || 0;
                                  } else if (assetLower === "usdc" || assetLower === "fxusd") {
                                    depositTokenPriceUSD = 1.0;
                                  } else if (assetLower.includes("ha")) {
                                    // For ha tokens, use pegged token price in USD
                                    depositTokenPriceUSD = peggedTokenPriceUsdWei > 0n
                                      ? Number(formatUnits(peggedTokenPriceUsdWei, 18))
                                      : 0;
                                  }
                                }
                                const feeUSD = feeAmount * depositTokenPriceUSD;
                                return (
                                  <>
                                    {feePercentage.toFixed(2)}% ({feeUSD > 0 ? `$${feeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "..."})
                                    {feePercentage > 2 && " ⚠️"}
                                  </>
                                );
                              })()}
                            </span>
                          </div>
                          {feePercentage > 2 && (
                            <div className="mt-2 text-xs text-red-600 font-medium">
                              ⚠️ High fee warning: Fees above 2% may
                              significantly impact your returns
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}

                  {activeTab === "withdraw" && !simpleMode ? (
                  <div className="mt-3 mb-4 space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        setWithdrawOverviewExpanded((prev) => !prev)
                      }
                      className="flex w-full items-center justify-between text-sm font-semibold text-[#1E4775] mb-1"
                      aria-expanded={withdrawOverviewExpanded}
                    >
                      <span>Transaction Overview</span>
                      {withdrawOverviewExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-[#1E4775]/70" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-[#1E4775]/70" />
                      )}
                    </button>
                    <div
                      className={`p-3 rounded-lg border ${
                        redeemDryRun?.feePercentage !== undefined &&
                        redeemDryRun?.feePercentage > 2
                          ? "bg-red-50 border-red-300"
                          : "bg-[#17395F]/5 border-[#1E4775]/10"
                      }`}
                    >
                      {(!amount || parseFloat(amount || "0") <= 0) &&
                        (!redeemInputAmount || redeemInputAmount === 0n) && (
                          <div className="text-xs text-[#1E4775]/70">
                            Enter an amount to see steps, receive, and fees.
                          </div>
                        )}

                      {redeemInputAmount &&
                        redeemInputAmount > 0n &&
                        redeemDryRunLoading && (
                          <div className="text-xs text-[#1E4775]/70">
                            Calculating fee...
                          </div>
                        )}

                      {redeemInputAmount &&
                        redeemInputAmount > 0n &&
                        !redeemDryRunLoading &&
                        redeemDryRunError && (
                          <div className="text-xs text-red-600 space-y-1">
                            <div>Fee unavailable (dry-run error)</div>
                            <div className="text-[11px] text-red-500/80 break-words">
                              {redeemDryRunError?.shortMessage ||
                                redeemDryRunError?.message ||
                                "Error calling redeemPeggedTokenDryRun"}
                            </div>
                          </div>
                        )}

                      {redeemInputAmount &&
                        redeemInputAmount > 0n &&
                        !redeemDryRunLoading &&
                        !redeemDryRun &&
                        !redeemDryRunError && (
                          <div className="text-xs text-[#1E4775]/70">
                            Fee unavailable
                          </div>
                        )}

                      {redeemInputAmount &&
                        redeemInputAmount > 0n &&
                        redeemDryRun && (
                          <div className="space-y-2 text-sm">
                            {redeemDryRun.isDisallowed && (
                              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                ⚠️ Redemption currently disallowed (100% fee).
                                Please try again later.
                              </div>
                            )}

                            {withdrawOverviewExpanded &&
                              withdrawOverviewSteps.length > 0 && (
                              <div className="space-y-1.5 pb-2 border-b border-[#1E4775]/20">
                                {withdrawOverviewSteps.map((step) => (
                                  <div
                                    key={step.label}
                                    className="flex justify-between items-baseline gap-3 text-xs"
                                  >
                                    <span className="text-[#1E4775]/70">
                                      {step.label}
                                    </span>
                                    <span className="font-mono font-medium text-[#1E4775] text-right">
                                      {step.detail}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div
                              className={`flex justify-between items-start gap-3 ${
                                withdrawOverviewExpanded ? "pt-0.5" : ""
                              }`}
                            >
                              <span className="text-sm font-semibold text-[#1E4775]">
                                {redeemPreview?.isCapped
                                  ? "You will receive (this redeem)"
                                  : "You will receive"}
                              </span>
                              <div className="text-right">
                                {(() => {
                                  const outputSymbol = redeemCollateralSymbol;
                                  const outputAmount = Number(
                                    formatEther(
                                      redeemDryRun.netCollateralReturned || 0n
                                    )
                                  );
                                  const usdValue = amountToUSD(
                                    outputAmount,
                                    outputSymbol,
                                    withdrawRedeemPriceInputs
                                  );
                                  const estimatedTotal =
                                    redeemPreview?.isCapped
                                      ? Number(
                                          formatEther(
                                            redeemPreview.estimatedTotalWrapped
                                          )
                                        )
                                      : null;
                                  const estimatedUsd =
                                    estimatedTotal !== null
                                      ? amountToUSD(
                                          estimatedTotal,
                                          outputSymbol,
                                          withdrawRedeemPriceInputs
                                        )
                                      : 0;
                                  return (
                                    <>
                                      <div className="text-lg font-bold text-[#1E4775] font-mono leading-tight">
                                        {outputAmount.toFixed(6)} {outputSymbol}
                                      </div>
                                      {usdValue > 0 && (
                                        <div className="text-xs text-[#1E4775]/50 font-mono">
                                          ~$
                                          {usdValue.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </div>
                                      )}
                                      {withdrawOverviewExpanded &&
                                        estimatedTotal !== null &&
                                        estimatedTotal > outputAmount && (
                                          <div className="text-[11px] text-[#1E4775]/60 font-mono mt-1">
                                            ≈ {estimatedTotal.toFixed(6)}{" "}
                                            {outputSymbol} total if all{" "}
                                            {peggedTokenSymbol} is redeemed
                                            {estimatedUsd > 0
                                              ? ` (~$${estimatedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                                              : ""}
                                          </div>
                                        )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {withdrawOverviewExpanded && (
                            <div className="space-y-1 text-xs pt-2 border-t border-[#1E4775]/20">
                              {showEarlyWithdrawalFees && (
                                <>
                                  {earlyWithdrawalFees.map((fee, idx) => {
                                    const feeAmount = Number(
                                      formatEther(fee.amount)
                                    );
                                    const peggedPriceUSD =
                                      peggedTokenPriceUsdWei > 0n
                                        ? Number(
                                            formatUnits(
                                              peggedTokenPriceUsdWei,
                                              18
                                            )
                                          )
                                        : 0;
                                    const feeUSD = amountToUSD(
                                      feeAmount,
                                      peggedTokenSymbol,
                                      {
                                        ethPrice: ethPrice ?? 0,
                                        peggedPriceUSD,
                                      }
                                    );
                                    return (
                                      <div
                                        key={`${fee.poolType}-${idx}`}
                                        className="flex justify-between items-center gap-2"
                                      >
                                        <span className="text-[#1E4775]/70">
                                          Early withdrawal fee
                                        </span>
                                        <span className="font-bold font-mono text-[#1E4775] text-right">
                                          {fee.feePercent.toFixed(2)}% ·{" "}
                                          {feeAmount.toFixed(6)}{" "}
                                          {peggedTokenSymbol}
                                          {feeUSD > 0
                                            ? ` (~$${feeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                                            : ""}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </>
                              )}

                              {redeemDryRun.feePercentage !== undefined && (
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-[#1E4775]/70">
                                    Redemption fee
                                  </span>
                                  <span
                                    className={`font-bold font-mono text-right ${
                                      redeemDryRun.feePercentage > 2
                                        ? "text-red-600"
                                        : "text-[#1E4775]"
                                    }`}
                                  >
                                    {(() => {
                                      const feeAmount = Number(
                                        formatEther(redeemDryRun.fee)
                                      );
                                      const feeUSD = amountToUSD(
                                        feeAmount,
                                        redeemCollateralSymbol,
                                        withdrawRedeemPriceInputs
                                      );
                                      return (
                                        <>
                                          {redeemDryRun.feePercentage.toFixed(2)}% ·{" "}
                                          {feeAmount.toFixed(6)}{" "}
                                          {redeemCollateralSymbol}
                                          {feeUSD > 0
                                            ? ` (~$${feeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                                            : ""}
                                          {redeemDryRun.feePercentage > 2 &&
                                            " ⚠️"}
                                        </>
                                      );
                                    })()}
                                  </span>
                                </div>
                              )}

                              {redeemDryRun.discountPercentage > 0 && (
                                <div className="flex justify-between items-center text-green-700">
                                  <span>Bonus</span>
                                  <span className="font-bold font-mono">
                                    {redeemDryRun.discountPercentage.toFixed(2)}%
                                    ({Number(formatEther(redeemDryRun.discount)).toFixed(6)}{" "}
                                    {redeemCollateralSymbol})
                                  </span>
                                </div>
                              )}
                            </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                  ) : null}

                {/* Error - beneath transaction overview (withdraw) */}
                {activeTab === "withdraw" && error && !simpleMode && (
                  <ErrorBanner message={error} className="mt-3" />
                )}

                {/* Simple Mode Info - Show optimized selection */}
                {activeTab === "deposit" &&
                  simpleMode &&
                  depositInStabilityPool && (
                    <div className="mt-1.5 p-2 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50">
                      <p className="text-xs text-[#1E4775]/70">
                        Optimized for best yield: Depositing to{" "}
                        <span className="font-semibold">
                          {bestPoolType === "collateral"
                            ? "Collateral"
                            : "Sail"}
                        </span>
                        {" "}
                        pool
                      </p>
                    </div>
                  )}

                {activeTab === "withdraw" &&
                  !simpleMode &&
                  step !== "success" && (
                    <div className="flex gap-3 pt-5 border-t border-[#1E4775]/20">
                      {isProcessing ? (
                        <button
                          disabled
                          className="w-full py-2 px-4 bg-[#FF8A7A]/50 text-white font-semibold cursor-not-allowed"
                        >
                          Processing...
                        </button>
                      ) : step === "error" ? (
                        <button
                          onClick={handleAction}
                          className="w-full py-2 px-4 bg-[#FF8A7A] text-white font-semibold hover:bg-[#FF6B5A] transition-colors"
                        >
                          Try Again
                        </button>
                      ) : (
                        <>
                          {step !== "input" && (
                            <button
                              onClick={handleBackToWithdrawInput}
                              className="shrink-0 py-2 px-4 rounded-md bg-white/85 backdrop-blur-sm text-[#1E4775] border-2 border-[#1E4775]/30 font-semibold hover:bg-[#1E4775]/5 transition-colors"
                            >
                              Back
                            </button>
                          )}
                          <button
                            onClick={handleAction}
                            disabled={isButtonDisabled()}
                            className={`py-3 px-4 rounded-md bg-[#FF8A7A] text-white font-semibold hover:bg-[#FF6B5A] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed ${
                              step === "input" ? "w-full" : "flex-1"
                            }`}
                          >
                            {getButtonText()}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                {/* Mint Only / Deposit Options - Only for Deposit Tab (Advanced Mode) */}
                {activeTab === "deposit" && !simpleMode && !isDirectPeggedDeposit && (
                  <div className="space-y-2 pt-2 border-t border-[#1E4775]/10">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mintOnly}
                        onChange={(e) => {
                          setMintOnly(e.target.checked);
                          setDepositInStabilityPool(!e.target.checked);
                          setError(null);
                          setStep("input");
                        }}
                        className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer"
                        disabled={isProcessing}
                      />
                      <span className="text-sm font-medium text-[#1E4775]">
                        Mint only (do not deposit to stability pool)
                      </span>
                    </label>

                    {!mintOnly && (
                      <label className="flex items-center gap-3 cursor-pointer pl-8">
                        <input
                          type="checkbox"
                          checked={depositInStabilityPool}
                          onChange={(e) =>
                            setDepositInStabilityPool(e.target.checked)
                          }
                          className="w-5 h-5 text-[#1E4775] border-[#1E4775]/30 focus:ring-2 focus:ring-[#1E4775]/20 focus:ring-offset-0 cursor-pointer"
                          disabled={isProcessing}
                        />
                        <span className="text-sm font-medium text-[#1E4775]">
                          Deposit in stability pool
                        </span>
                      </label>
                    )}

                    {depositInStabilityPool && (
                      <div className="space-y-3 pl-8">
                        {/* Toggle for Collateral vs Sail */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#1E4775]/70">
                            Pool type:
                          </span>
                          <div className="flex items-center rounded-md overflow-hidden bg-[#17395F]/10 p-1">
                            <button
                              type="button"
                              onClick={() => setStabilityPoolType("collateral")}
                              disabled={isProcessing}
                              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                                stabilityPoolType === "collateral"
                                  ? "bg-[#1E4775] text-white shadow-sm"
                                  : "text-[#1E4775]/70 hover:text-[#1E4775]"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              Collateral
                            </button>
                            <button
                              type="button"
                              onClick={() => setStabilityPoolType("sail")}
                              disabled={isProcessing}
                              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                                stabilityPoolType === "sail"
                                  ? "bg-[#1E4775] text-white shadow-sm"
                                  : "text-[#1E4775]/70 hover:text-[#1E4775]"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              Sail
                            </button>
                          </div>
                        </div>

                        {/* APR Display */}
                        <div className="p-2 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#1E4775]/70">
                              Pool APR:
                            </span>
                            <span className="text-sm font-bold text-[#1E4775]">
                              {stabilityPoolAddress
                                ? advancedStabilityPoolAprReadsEnabled &&
                                  !advancedStabilityPoolAprReads
                                  ? "Loading..."
                                  : formatAPR(stabilityPoolAPR)
                                : "-"}
                            </span>
                          </div>
                        </div>

                        {/* Explainer */}
                        <div className="p-2 rounded-md bg-[#17395F]/5 border border-[#17395F]/20">
                          <p className="text-xs text-[#1E4775]/80 leading-relaxed">
                            {stabilityPoolType === "collateral" ? (
                              <>
                                <span className="font-semibold">
                                  Collateral stability pool
                                </span>
                                {" "}
                                converts anchor tokens to{" "}
                                <span className="font-semibold">
                                  market collateral
                                </span>
                                {" "}
                                at market rates when the market reaches its
                                minimum collateral ratio.
                              </>
                            ) : (
                              <>
                                <span className="font-semibold">
                                  Sail stability pool
                                </span>
                                {" "}
                                converts anchor tokens to{" "}
                                <span className="font-semibold">
                                  Sail tokens
                                </span>
                                {" "}
                                at market rates when the market reaches its
                                minimum collateral ratio.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Stability Pool Type Selector - Only for Deposit */}
                {activeTab === "deposit" && (
                  <div className="space-y-2 pt-2 border-t border-[#1E4775]/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#1E4775]/70">
                        Pool type:
                      </span>
                      <div className="flex items-center rounded-md overflow-hidden bg-[#17395F]/10 p-1">
                        <button
                          type="button"
                          onClick={() => setStabilityPoolType("collateral")}
                          disabled={isProcessing}
                          className={`px-3 py-1.5 text-xs font-medium transition-all ${
                            stabilityPoolType === "collateral"
                              ? "bg-[#1E4775] text-white shadow-sm"
                              : "text-[#1E4775]/70 hover:text-[#1E4775]"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          Collateral
                        </button>
                        <button
                          type="button"
                          onClick={() => setStabilityPoolType("sail")}
                          disabled={isProcessing}
                          className={`px-3 py-1.5 text-xs font-medium transition-all ${
                            stabilityPoolType === "sail"
                              ? "bg-[#1E4775] text-white shadow-sm"
                              : "text-[#1E4775]/70 hover:text-[#1E4775]"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          Sail
                        </button>
                      </div>
                    </div>

                    {/* APR Display */}
                    <div className="p-2 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#1E4775]/70">
                          Pool APR:
                        </span>
                        <span className="text-sm font-bold text-[#1E4775]">
                          {stabilityPoolAddress
                            ? advancedStabilityPoolAprReadsEnabled &&
                              !advancedStabilityPoolAprReads
                              ? "Loading..."
                              : formatAPR(stabilityPoolAPR)
                            : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Explainer */}
                    <div className="p-2 rounded-md bg-[#17395F]/5 border border-[#17395F]/20">
                      <p className="text-xs text-[#1E4775]/80 leading-relaxed">
                        {stabilityPoolType === "collateral" ? (
                          <>
                            <span className="font-semibold">
                              Collateral stability pool
                            </span>
                            {" "}
                            converts anchor tokens to{" "}
                            <span className="font-semibold">
                              market collateral
                            </span>
                            {" "}
                            at market rates when the market reaches its minimum
                            collateral ratio.
                          </>
                        ) : (
                          <>
                            <span className="font-semibold">
                              Sail stability pool
                            </span>
                            {" "}
                            converts anchor tokens to{" "}
                            <span className="font-semibold">Sail tokens</span>
                            {" "}
                            at market rates when the market reaches its minimum
                            collateral ratio.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Current Deposit & Ledger Marks Info - Only for Deposit Tab */}
                {activeTab === "deposit" && (
                  <div className="space-y-3">
                    {currentDeposit > 0n && (
                      <div className="p-2 bg-[#17395F]/10 border border-[#17395F]/20">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-[#1E4775]/70">
                            Current Deposit:
                          </span>
                          <span className="text-sm font-semibold text-[#1E4775]">
                            {formatEther(currentDeposit)} {peggedTokenSymbol}
                          </span>
                        </div>
                        {currentDepositUSD > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[#1E4775]/70">
                              Ledger marks per day:
                            </span>
                            <span className="text-sm font-bold text-[#1E4775]">
                              {currentLedgerMarksPerDay.toFixed(2)} ledger
                              marks/day
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transaction Preview - Always visible */}
                    <div className="p-2 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#1E4775]/70">
                          {amount &&
                          parseFloat(amount) > 0 &&
                          expectedMintOutput
                            ? "After deposit:"
                            : "Current balance:"}
                        </span>
                        <span className="text-sm font-semibold text-[#1E4775]">
                          {amount &&
                          parseFloat(amount) > 0 &&
                          expectedMintOutput
                            ? `${formatEther(
                                currentDeposit + expectedMintOutput
                              )} ${peggedTokenSymbol}`
                            : `${formatEther(
                                currentDeposit
                              )} ${peggedTokenSymbol}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error - right column only for deposit; withdraw shows error beneath overview in main content */}
                {activeTab !== "withdraw" && error && (
                  <ErrorBanner message={error} />
                )}

                {txHash && (
                  <div className="text-xs text-center text-[#1E4775]/70">
                    Tx:{" "}
                    <a
                      href={`https://etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-[#1E4775]"
                    >
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </a>
                  </div>
                )}

                {step === "success" && (
                  <div className="p-3 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]/30 text-[#1E4775] text-sm text-center">
                    ✅{" "}
                    {activeTab === "deposit"
                      ? "Mint"
                      : activeTab === "withdraw"
                      ? "Withdraw"
                      : "Redeem"}
                    {" "}
                    successful!
                  </div>
                )}
              </>
            )}

          {step !== "success" && !simpleMode && (
            <div className="flex gap-3 p-4 border-t border-[#1E4775]/20">
              {isProcessing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2 px-4 bg-white/85 backdrop-blur-sm text-[#1E4775] border-2 border-[#1E4775]/30 font-medium transition-colors hover:bg-[#1E4775]/5"
                  >
                    Cancel
                  </button>
                  <button
                    disabled
                    className="flex-1 py-2 px-4 font-medium cursor-not-allowed bg-[#FF8A7A]/50 text-white"
                  >
                    {getButtonText()}
                  </button>
                </>
              ) : step === "error" ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2 px-4 bg-white/85 backdrop-blur-sm text-[#1E4775] border-2 border-[#1E4775]/30 font-medium transition-colors hover:bg-[#1E4775]/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAction}
                    className="flex-1 py-2 px-4 font-medium transition-colors bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white"
                  >
                    {getButtonText()}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={
                      step === "input"
                        ? handleCancel
                        : handleBackToWithdrawInput
                    }
                    className="flex-1 py-2 px-4 bg-white/85 backdrop-blur-sm text-[#1E4775] border-2 border-[#1E4775]/30 font-medium transition-colors hover:bg-[#1E4775]/5"
                  >
                    {step === "input" ? "Cancel" : "Back"}
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={isButtonDisabled()}
                    className="flex-1 py-2 px-4 font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white"
                  >
                    {getButtonText()}
                  </button>
                </>
              )}
            </div>
          )}
        </DepositModalShell>
      )}
    </>
  );
}
