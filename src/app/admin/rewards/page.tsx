"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import WalletButton from "@/components/WalletButton";
import RewardDeposits from "@/components/admin/RewardDeposits";

export default function AdminRewardsPage() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-4xl font-medium font-geo text-left text-white">
              ADMIN / REWARDS
            </h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-4xl font-medium font-geo text-left text-white">
            ADMIN / REWARDS
          </h1>
          <Link href="/admin">
            <button className="py-2 px-4 bg-white/10 text-white font-medium hover:bg-white/15 transition-colors">
              Back to Admin
            </button>
          </Link>
        </div>

        {!isConnected ? (
          <div className="bg-zinc-900/50 p-6 text-center">
            <p className="mb-4 text-white/70">
              Please connect your wallet to access admin functions
            </p>
            <div className="inline-block">
              <WalletButton />
            </div>
          </div>
        ) : (
          <RewardDeposits />
        )}
      </main>
    </div>
  );
}

