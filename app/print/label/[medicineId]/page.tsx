'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatINR } from '@/lib/formatters';
import { PrintToolbar } from '@/components/layout/PrintToolbar';
import { Barcode } from '@/components/ui/Barcode';

export default function PrintRackLabelPage() {
  const params = useParams();
  const medicineId = params.medicineId as string;

  const { medicines, settings } = useAppStore();

  const medicine = useMemo(() => {
    return medicines.find((m) => m.id === medicineId);
  }, [medicines, medicineId]);

  if (!medicine) {
    return (
      <div className="p-8 text-center text-slate-500">
        <PrintToolbar title="Label Not Found" />
        <div className="mt-12 text-slate-700 font-bold">Medicine record not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 pb-12 print:bg-white print:pb-0">
      <PrintToolbar title={`Shelf Label: ${medicine.code} (${medicine.tradeName})`} />

      <div className="max-w-2xl mx-auto my-8 p-6 print:m-0 print:p-0">
        <div className="no-print mb-4 p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
          <span>Standard 3×2 Shelf Rack Bin Labels (Grid of 6 for adhesive sticker printing)</span>
          <span className="font-mono text-emerald-700 font-semibold">{medicine.code}</span>
        </div>

        {/* Grid of 6 labels on standard sheet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
          {[...Array(6)].map((_, idx) => (
            <div
              key={idx}
              className="p-3 bg-white border-2 border-slate-900 rounded-xl flex flex-col gap-1.5 shadow-sm print:shadow-none break-inside-avoid"
            >
              {/* Top Banner */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 truncate mr-2">
                  {settings.shopName.split(' ')[0]} PHARMACY
                </span>
                <span className="font-mono text-xs font-extrabold bg-slate-950 text-white px-2 py-0.5 rounded flex-shrink-0">
                  RACK {medicine.rackNo}
                </span>
              </div>

              {/* Medicine details */}
              <div>
                <h2 className="text-sm font-extrabold text-slate-950 leading-tight line-clamp-2">
                  {medicine.tradeName}
                </h2>
                <p className="text-[10px] text-slate-600 line-clamp-2 leading-snug mt-0.5">
                  {medicine.genericName}
                </p>
              </div>

              {/* Price row */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-400">Retail MRP</div>
                  <div className="text-sm font-extrabold text-slate-950">
                    {formatINR(medicine.sellingPrice)}
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-500">{medicine.code}</span>
              </div>

              {/* Barcode — full width, contained */}
              <div className="w-full pt-1 border-t border-slate-200">
                <Barcode value={medicine.code} height={28} showValue={false} className="w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
