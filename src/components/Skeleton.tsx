"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-sand-200/60 rounded-lg ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Wave tracker skeleton */}
      <div className="bg-white border border-sand-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-44 flex-shrink-0 rounded-xl" />)}
        </div>
      </div>
      {/* Table skeleton */}
      <Skeleton className="h-10 w-full rounded-xl" />
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16 ml-auto" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function MeSkeleton() {
  return (
    <div className="bg-white border border-sand-200 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-14 ml-auto" />
          <Skeleton className="h-2 w-20" />
        </div>
      </div>
      {/* Countdown */}
      <div className="bg-brand-50/50 rounded-xl p-4 mb-3">
        <Skeleton className="h-3 w-28 mb-2" />
        <Skeleton className="h-10 w-20 mb-2" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      {/* Queue */}
      <div className="bg-sand-50 rounded-xl p-3 mb-3">
        <Skeleton className="h-3 w-32 mb-2" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      {/* Badges */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
      {/* Timeline */}
      <Skeleton className="h-3 w-24 mb-3" />
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-14 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48 mb-1" />
      <Skeleton className="h-3 w-64" />
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white border border-sand-200 rounded-xl p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      {/* Chart placeholder */}
      <div className="bg-white border border-sand-200 rounded-xl p-4">
        <Skeleton className="h-4 w-48 mb-3" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}
