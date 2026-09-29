'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { Info, X } from 'lucide-react';

export function DemoBanner() {
  const bannerDismissed = useAppStore((s) => s.bannerDismissed);
  const dismissBanner = useAppStore((s) => s.dismissBanner);

  if (bannerDismissed) return null;

  return (
    <aside aria-label="Demo notice" className="no-print bg-emerald-900 text-emerald-100 text-xs sm:text-sm px-4 py-2 flex items-center justify-between border-b border-emerald-800 shadow-inner">
      <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
        <Info className="w-4 h-4 text-emerald-300 flex-shrink-0" />
        <span>
          <strong className="font-semibold text-white">Demo mode:</strong> Data is stored in your browser. All medicines, stock, supplies, and sales are persistent.
        </span>
      </div>
      <button
        onClick={dismissBanner}
        aria-label="Dismiss banner"
        className="text-emerald-300 hover:text-white p-1 rounded transition-colors ml-2"
        title="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
}
