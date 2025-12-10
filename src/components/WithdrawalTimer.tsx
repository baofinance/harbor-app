"use client";

import { useEffect, useState } from "react";

interface WithdrawalTimerProps {
  withdrawableAt: bigint;
  onExpire?: () => void;
}

export function WithdrawalTimer({
  withdrawableAt,
  onExpire,
}: WithdrawalTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const withdrawableAtNum = Number(withdrawableAt);
      const remaining = withdrawableAtNum - now;

      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsExpired(true);
        if (onExpire) onExpire();
      } else {
        setTimeRemaining(remaining);
        setIsExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [withdrawableAt, onExpire]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "Ready";
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <span className={`text-[10px] font-mono ${
      isExpired ? "text-green-500" : "text-[#1E4775]/70"
    }`}>
      {isExpired ? "Ready to withdraw" : formatTime(timeRemaining)}
    </span>
  );
}


