"use client";

import React, { useState } from "react";
import { useAddresses } from "../contexts/AddressesContext";
import { useContractWrite } from "../contexts/ContractWriteContext";
import { minterABI } from "../abis/minter";
import { parseUnits } from "ethers";

export function LeverageTab() {
 const [leverage, setLeverage] = useState<string>("2");
 const [collateralAmount, setCollateralAmount] = useState<string>("");
 const [peggedAmount, setPeggedAmount] = useState<string>("");
 const [leveragedAmount, setLeveragedAmount] = useState<string>("");
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const { addresses } = useAddresses();
 const { writeAsync: mintLeveragedTokens } = useContractWrite({
 address: addresses.minter as `0x${string}`,
 abi: minterABI,
 functionName:"mintLeveragedTokens",
 });

 const handleLeverage = (e: React.ChangeEvent<HTMLInputElement>) => {
 const value = e.target.value;
 if (/^\d*\.?\d*$/.test(value)) {
 const numValue = parseFloat(value);
 if (!isNaN(numValue)) {
 if (numValue < 1) {
 setLeverage("1");
 } else if (numValue > 10) {
 setLeverage("10");
 } else {
 setLeverage(value);
 }
 }
 }
 };

 const handleCollateralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const value = e.target.value;
 if (/^\d*\.?\d*$/.test(value)) {
 setCollateralAmount(value);
 if (value) {
 const collateral = parseFloat(value);
 const leverageNum = parseFloat(leverage);
 if (!isNaN(collateral) && !isNaN(leverageNum)) {
 const pegged = collateral * leverageNum;
 const leveraged = collateral * (leverageNum - 1);
 setPeggedAmount(pegged.toFixed(2));
 setLeveragedAmount(leveraged.toFixed(2));
 }
 } else {
 setPeggedAmount("");
 setLeveragedAmount("");
 }
 }
 };

 const handlePeggedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const value = e.target.value;
 if (/^\d*\.?\d*$/.test(value)) {
 setPeggedAmount(value);
 if (value) {
 const pegged = parseFloat(value);
 const leverageNum = parseFloat(leverage);
 if (!isNaN(pegged) && !isNaN(leverageNum)) {
 const collateral = pegged / leverageNum;
 const leveraged = pegged - collateral;
 setCollateralAmount(collateral.toFixed(2));
 setLeveragedAmount(leveraged.toFixed(2));
 }
 } else {
 setCollateralAmount("");
 setLeveragedAmount("");
 }
 }
 };

 const handleLeveragedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const value = e.target.value;
 if (/^\d*\.?\d*$/.test(value)) {
 setLeveragedAmount(value);
 if (value) {
 const leveraged = parseFloat(value);
 const leverageNum = parseFloat(leverage);
 if (!isNaN(leveraged) && !isNaN(leverageNum)) {
 const collateral = leveraged / (leverageNum - 1);
 const pegged = collateral * leverageNum;
 setCollateralAmount(collateral.toFixed(2));
 setPeggedAmount(pegged.toFixed(2));
 }
 } else {
 setCollateralAmount("");
 setPeggedAmount("");
 }
 }
 };

 const handleMint = async () => {
 if (!collateralAmount) {
 setError("Please enter an amount");
 return;
 }

 try {
 setIsLoading(true);
 setError(null);

 // Convert collateral amount to wei (18 decimals)
 const collateralWei = parseUnits(collateralAmount, 18);

 // Call the mint function
 const tx = await mintLeveragedTokens({
 args: [collateralWei],
 });

 // Wait for transaction to be mined
 await tx.hash;

 // Reset form
 setCollateralAmount("");
 setPeggedAmount("");
 setLeveragedAmount("");
 } catch (err) {
 console.error("Mint error:", err);
 setError(err instanceof Error ? err.message :"Failed to mint tokens");
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="space-y-4">
 <div>
 <label
 htmlFor="leverage"
 className="block text-sm font-medium text-gray-700"
 >
 Leverage Ratio
 </label>
 <div className="mt-1">
 <div className="relative">
 <input
 type="text"
 name="leverage"
 id="leverage"
 value={leverage}
 onChange={handleLeverage}
 placeholder="0.0"
 className="w-full bg-[#202020] text-white focus:outline-none transition-all p-4 pr-24"
 />
 </div>
 </div>
 <p className="mt-2 text-sm text-gray-500">
 Choose a leverage ratio between 1x and 10x
 </p>
 </div>

 <div>
 <label
 htmlFor="collateral"
 className="block text-sm font-medium text-gray-700"
 >
 Collateral Amount (ETH)
 </label>
 <div className="mt-1">
 <div className="relative">
 <input
 type="text"
 name="collateral"
 id="collateral"
 value={collateralAmount}
 onChange={handleCollateralChange}
 placeholder="0.0"
 className="w-full bg-[#202020] text-white focus:outline-none transition-all p-4 pr-24"
 />
 </div>
 </div>
 </div>

 <div>
 <label
 htmlFor="pegged"
 className="block text-sm font-medium text-gray-700"
 >
 Pegged Tokens to Receive
 </label>
 <div className="mt-1">
 <div className="relative">
 <input
 type="text"
 name="pegged"
 id="pegged"
 value={peggedAmount}
 onChange={handlePeggedChange}
 placeholder="0.0"
 className="w-full bg-[#202020] text-white focus:outline-none transition-all p-4 pr-24"
 />
 </div>
 </div>
 </div>

 <div>
 <label
 htmlFor="leveraged"
 className="block text-sm font-medium text-gray-700"
 >
 Leveraged Tokens to Receive
 </label>
 <div className="mt-1">
 <div className="relative">
 <input
 type="text"
 name="leveraged"
 id="leveraged"
 value={leveragedAmount}
 onChange={handleLeveragedChange}
 placeholder="0.0"
 className="w-full bg-[#202020] text-white focus:outline-none transition-all p-4 pr-24"
 />
 </div>
 </div>
 </div>
 </div>

 {error && (
 <div className="bg-red-50 p-4">
 <div className="flex">
 <div className="ml-3">
 <h3 className="text-sm font-medium text-red-800">{error}</h3>
 </div>
 </div>
 </div>
 )}

 <div className="flex justify-end">
 <button
 type="button"
 onClick={handleMint}
 disabled={isLoading || !collateralAmount}
 className="inline-flex items-center border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isLoading ?"Minting..." :"Mint Tokens"}
 </button>
 </div>
 </div>
 );
}
