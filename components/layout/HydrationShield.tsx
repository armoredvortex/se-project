'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';

export function HydrationShield({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const setHasHydrated = useAppStore((s) => s.setHasHydrated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fallback if rehydrate completed before listener attached
    if (!hasHydrated) {
      const timer = setTimeout(() => {
        setHasHydrated(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [hasHydrated, setHasHydrated]);

  if (!mounted || !hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Skeleton Top Bar */}
        <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between animate-pulse">
          <div className="h-6 w-48 bg-slate-200 rounded"></div>
          <div className="h-8 w-32 bg-slate-200 rounded"></div>
        </div>

        {/* Skeleton Body */}
        <div className="flex-1 flex">
          {/* Skeleton Sidebar */}
          <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 space-y-4 hidden md:block">
            <div className="h-8 w-3/4 bg-slate-800 rounded"></div>
            <div className="space-y-2 pt-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-800 rounded-lg"></div>
              ))}
            </div>
          </div>

          {/* Skeleton Content */}
          <div className="flex-1 p-6 md:p-8 space-y-6">
            <div className="h-8 w-64 bg-slate-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="h-4 w-20 bg-slate-200 rounded"></div>
                  <div className="h-8 w-32 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
            <div className="h-72 bg-white border border-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
