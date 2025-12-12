"use client";

import React from"react";
import Link from"next/link";
import { usePools } from"@/hooks/usePools";
import Image from"next/image";

export default function Earn() {
 const { getAllPools } = usePools();
 const pools = getAllPools();

 // Group pools by market
 const poolsByGroup = pools.reduce((acc, pool) => {
 const key = pool.groupName;
 if (!acc[key]) {
 acc[key] = [];
 }
 acc[key].push(pool);
 return acc;
 }, {} as Record<string, typeof pools>);

 return (
 <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
 <main className="container mx-auto px-4 sm:px-10 pb-6">
 <section className="mb-6">
 <div className="p-4">
 <h1 className="font-semibold font-mono text-white text-2xl mb-2">
 Earn
 </h1>
 <p className="text-white/60 text-sm mb-6">
 Earn rewards by providing liquidity to stability pools.
 </p>
 </div>
 </section>

 {/* Pools List */}
 <section className="space-y-6">
 {Object.entries(poolsByGroup).map(([groupName, groupPools]) => {
 const firstPool = groupPools[0];
 return (
 <div key={groupName} className="bg-[#17395F] p-6">
 <div className="flex items-center gap-3 mb-4">
 <span className="text-2xl">{firstPool.groupIcon}</span>
 <h2 className="font-semibold font-mono text-white text-xl">
 {groupName}
 </h2>
 {firstPool.groupSubText && (
 <span className="text-white/60 text-sm">
 {firstPool.groupSubText}
 </span>
 )}
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {groupPools.map((pool) => (
 <Link
 key={pool.id}
 href={`/earn/${pool.marketId}/${pool.poolType}`}
 className="bg-white/10 hover:bg-white/20 p-4 transition-colors"
 >
 <div className="flex items-center gap-3 mb-2">
 {pool.assetIcons.map((icon, idx) => (
 <Image
 key={idx}
 src={icon}
 alt=""
 width={24}
 height={24}
 className="rounded-full"
 />
 ))}
 <div>
 <h3 className="font-medium text-white">{pool.name}</h3>
 <p className="text-xs text-white/60">{pool.type}</p>
 </div>
 </div>
 <p className="text-sm text-white/80">{pool.description}</p>
 </Link>
 ))}
 </div>
 </div>
 );
 })}
 </section>
 </main>
 </div>
 );
}
