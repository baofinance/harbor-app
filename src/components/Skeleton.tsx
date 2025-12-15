"use client";

import clsx from "clsx";

interface SkeletonProps {
 className?: string;
 count?: number;
 inline?: boolean;
}

export function Skeleton({
 className,
 count = 1,
 inline = false,
}: SkeletonProps) {
 const elements = Array.from({ length: count }).map((_, i) => (
 <span
 key={i}
 className={clsx(
"bg-neutral-800 animate-pulse",
 inline ?"inline-block" :"block",
 className
 )}
 >
 &zwnj;
 </span>
 ));

 return <>{elements}</>;
}
