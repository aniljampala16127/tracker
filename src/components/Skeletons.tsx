"use client";

import { useCallback, useRef, useState, useEffect } from "react";

// ============================================
// Skeleton Shimmer Components
// ============================================
function Shimmer({ className }: { className: string }) {
  return (
    <div className={`animate-pulse bg-sand-200/60 rounded ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Wave tracker skeleton */}
      <div className="bg-white border border-sand-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Shimmer className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Shimmer className="h-4 w-32 mb-1.5" />
            <Shimmer className="h-3 w-20" />
          </div>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {[1,2,3].map(i => <Shimmer key={i} className="h-16 w-[180px] rounded-xl flex-shrink-0" />)}
        </div>
      </div>
      {/* Table header */}
      <Shimmer className="h-8 w-full rounded-lg" />
      {/* Table rows */}
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Shimmer className="w-8 h-8 rounded-lg" />
          <div className="flex-1">
            <Shimmer className="h-3.5 w-24 mb-1" />
            <Shimmer className="h-2.5 w-16" />
          </div>
          <Shimmer className="h-3 w-12" />
          <Shimmer className="h-3 w-12" />
          <Shimmer className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Shimmer className="h-5 w-48 mb-1" />
        <Shimmer className="h-3 w-64 mb-4" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white border border-sand-200 rounded-xl p-4">
            <Shimmer className="h-2.5 w-14 mb-2" />
            <Shimmer className="h-7 w-10" />
          </div>
        ))}
      </div>
      {/* AOR Progress */}
      <div className="bg-white border border-sand-200 rounded-xl p-4">
        <Shimmer className="h-4 w-28 mb-3" />
        <Shimmer className="h-2 w-full rounded-full mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <Shimmer className="h-14 rounded-lg" />
          <Shimmer className="h-14 rounded-lg" />
        </div>
      </div>
      {/* Chart */}
      <div className="bg-white border border-sand-200 rounded-xl p-4">
        <Shimmer className="h-4 w-40 mb-2" />
        <Shimmer className="h-3 w-56 mb-4" />
        <Shimmer className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function MeSkeleton() {
  return (
    <div>
      <Shimmer className="h-5 w-36 mb-1" />
      <Shimmer className="h-3 w-52 mb-5" />
      <div className="bg-white border border-sand-200 rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Shimmer className="w-12 h-12 rounded-xl" />
          <div className="flex-1">
            <Shimmer className="h-5 w-20 mb-1" />
            <Shimmer className="h-3 w-36" />
          </div>
          <div className="text-right">
            <Shimmer className="h-3 w-12 mb-1 ml-auto" />
            <Shimmer className="h-2.5 w-16 ml-auto" />
          </div>
        </div>
        {/* AOR countdown */}
        <Shimmer className="h-24 w-full rounded-xl mb-3" />
        {/* Queue position */}
        <Shimmer className="h-16 w-full rounded-xl mb-3" />
        {/* Badges */}
        <Shimmer className="h-28 w-full rounded-xl mb-4" />
        {/* Timeline rows */}
        {[1,2,3,4,5].map(i => (
          <Shimmer key={i} className="h-10 w-full rounded-lg mb-1" />
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div>
      <Shimmer className="h-4 w-12 mb-4" />
      <div className="bg-white border border-sand-200 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Shimmer className="w-11 h-11 rounded-full" />
          <div className="flex-1">
            <Shimmer className="h-5 w-20 mb-1" />
            <Shimmer className="h-3 w-36" />
          </div>
        </div>
        <Shimmer className="h-2 w-full rounded-full" />
      </div>
      <div className="bg-white border border-sand-200 rounded-xl p-5">
        <Shimmer className="h-4 w-24 mb-3" />
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Shimmer className="w-5 h-5 rounded-full" />
            <div className="flex-1">
              <Shimmer className="h-3.5 w-24 mb-1" />
              <Shimmer className="h-2.5 w-36" />
            </div>
            <Shimmer className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Pull-to-Refresh Hook
// ============================================
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const threshold = 80;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === 0 || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY <= 0) {
      setPulling(true);
      setPullDistance(Math.min(dy * 0.5, 120));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) { startY.current = 0; return; }
    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(50);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
    startY.current = 0;
  }, [pulling, pullDistance, onRefresh]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pulling: pulling || refreshing, pullDistance, refreshing };
}

export function PullIndicator({ pullDistance, refreshing }: { pullDistance: number; refreshing: boolean }) {
  if (pullDistance <= 0 && !refreshing) return null;
  const pct = Math.min(pullDistance / 80, 1);
  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all"
      style={{ height: pullDistance, opacity: pct }}
    >
      <div className={`w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full ${refreshing ? "animate-spin" : ""}`}
        style={{ transform: `rotate(${pct * 360}deg)` }}
      />
    </div>
  );
}
