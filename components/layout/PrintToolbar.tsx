'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';

export function PrintToolbar({ title }: { title: string }) {
  const router = useRouter();

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="no-print bg-slate-900 text-white px-4 py-3 sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-slate-600">|</span>
        <span className="text-xs sm:text-sm font-bold text-slate-200">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePrint}
          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow transition-all hover:scale-[1.02]"
        >
          <Printer className="w-4 h-4" />
          <span>Print Document</span>
        </button>
      </div>
    </div>
  );
}
