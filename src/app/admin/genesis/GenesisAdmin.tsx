"use client";

import React, { useState } from "react";
import { formatEther } from "viem";
import { useAdminAccess } from "../../../hooks/useAdminAccess";
import { useGenesisStatus } from "../../../hooks/useGenesisAdminStats";
import { useGenesisAdmin } from "../../../hooks/useAdminActions";

export function GenesisAdminPage() {
  const { isAdmin } = useAdminAccess();
  const { isActive, isEnded, totalCollateral, status } = useGenesisStatus();
  const { endGenesis, isPending, isSuccess } = useGenesisAdmin();

  if (!isAdmin) {
    return (
      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
          <div className="bg-zinc-900/50  p-6 text-center">
            <h2 className="text-2xl font-medium text-white mb-2 font-geo">
              Access Denied
            </h2>
            <p className="text-white/70">
              Only the Genesis owner can access this page.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
        <h1 className="text-4xl font-medium mb-6 font-geo text-white">
          GENESIS ADMIN
        </h1>

        {/* Status Overview */}
        <div className="bg-zinc-900/50  p-4 sm:p-6 mb-4">
          <h2 className="text-lg font-medium text-white mb-4 font-geo">
            Genesis Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-white/70">Status:</span>
              <span
                className={`ml-2 px-3 py-1 text-sm font-medium border ${
                  status === "ACTIVE"
                    ? "bg-blue-900/30 text-blue-400 border-blue-500/30"
                    : "bg-red-900/30 text-red-400 border-red-500/30"
                }`}
              >
                {status}
              </span>
            </div>
            <div>
              <span className="text-white/70">Total Collateral:</span>
              <span className="ml-2 font-mono text-white">
                {formatEther(totalCollateral)} wstETH
              </span>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="bg-zinc-900/50  p-4 sm:p-6 mb-4">
          <h2 className="text-lg font-medium text-white mb-4 font-geo">
            Admin Actions
          </h2>

          {isActive ? (
            <div>
              <p className="text-white/70 mb-4">
                Genesis is currently active. Users can deposit wstETH
                collateral. Once you're ready to end the genesis phase, click
                the button below.
              </p>
              <button
                onClick={endGenesis}
                disabled={isPending || totalCollateral === 0n}
                className="py-2 px-4 bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Ending Genesis..." : "End Genesis Phase"}
              </button>
              {totalCollateral === 0n && (
                <p className="text-yellow-400 mt-2 text-sm">
                  ⚠️ No collateral has been deposited yet. Genesis cannot be
                  ended.
                </p>
              )}
            </div>
          ) : (
            <div className="text-blue-400">
              <p>
                ✅ Genesis phase has ended. Users can now claim their tokens or
                withdraw collateral.
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500/30 text-blue-400">
              🎉 Genesis phase ended successfully! Users can now claim their
              tokens.
            </div>
          )}
        </div>

        {/* Genesis Statistics */}
        <div className="bg-zinc-900/50  p-4 sm:p-6">
          <h2 className="text-lg font-medium text-white mb-4 font-geo">
            Genesis Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4  bg-black/10">
              <div className="text-2xl font-semibold text-white">
                {formatEther(totalCollateral)}
              </div>
              <div className="text-white/70">Total wstETH Deposited</div>
            </div>
            <div className="text-center p-4  bg-black/10">
              <div className="text-2xl font-semibold text-white">
                {totalCollateral > 0n ? formatEther(totalCollateral / 2n) : "0"}
              </div>
              <div className="text-white/70">Pegged Tokens to be Minted</div>
            </div>
            <div className="text-center p-4  bg-black/10">
              <div className="text-2xl font-semibold text-white">
                {totalCollateral > 0n
                  ? formatEther(totalCollateral - totalCollateral / 2n)
                  : "0"}
              </div>
              <div className="text-white/70">Leveraged Tokens to be Minted</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
