'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatINR } from '@/lib/formatters';
import { numberToWordsIndian } from '@/lib/services/numberToWords';
import { PrintToolbar } from '@/components/layout/PrintToolbar';
import { format, parseISO } from 'date-fns';

export default function PrintChequePage() {
  const params = useParams();
  const supplyId = params.id as string;

  const { supplies, vendors, settings } = useAppStore();

  const supply = useMemo(() => {
    return supplies.find((s) => s.id === supplyId);
  }, [supplies, supplyId]);

  const vendor = useMemo(() => {
    if (!supply) return null;
    return vendors.find((v) => v.id === supply.vendorId);
  }, [vendors, supply]);

  if (!supply) {
    return (
      <div className="p-8 text-center text-slate-500">
        <PrintToolbar title="Cheque Not Found" />
        <div className="mt-12 text-slate-700 font-bold">Supply record not found.</div>
      </div>
    );
  }

  // Format date into 8 individual digits (DDMMYYYY)
  const dateObj = typeof supply.date === 'string' ? parseISO(supply.date) : supply.date;
  const dateStr = format(dateObj, 'ddMMyyyy'); // e.g. 29092026
  const dateDigits = dateStr.split('');

  const words = numberToWordsIndian(supply.totalAmount);

  return (
    <div className="min-h-screen bg-slate-100/60 pb-12 print:bg-white print:pb-0">
      <PrintToolbar title={`Cheque: ${supply.chequeNo} (${vendor?.name})`} />

      {/* Cheque Template Leaf */}
      <div className="max-w-3xl mx-auto my-10 p-8 bg-amber-50/40 border-2 border-slate-400 rounded-lg shadow-xl print:shadow-none print:border-slate-800 print:m-0 font-serif text-slate-900 relative overflow-hidden select-none">
        {/* Security Guilloche Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px]" />

        {/* Top Header */}
        <div className="flex items-start justify-between">
          {/* A/C Payee Only Stamp */}
          <div className="border-t-2 border-b-2 border-slate-800 py-0.5 px-3 transform -rotate-12 inline-block font-sans font-extrabold text-[11px] tracking-wider text-slate-800">
            A/C PAYEE ONLY
          </div>

          {/* Bank Info */}
          <div className="text-center font-sans">
            <h2 className="text-base font-extrabold tracking-wide text-slate-900 uppercase">
              STATE BANK OF INDIA
            </h2>
            <p className="text-[10px] text-slate-600">
              COMMERCIAL BRANCH, PUNE • IFS CODE: SBIN0004123
            </p>
          </div>

          {/* Date Box: DD MM YYYY */}
          <div className="flex flex-col items-end">
            <div className="text-[9px] font-sans text-slate-500 mb-0.5 tracking-wider font-semibold">
              D D M M Y Y Y Y
            </div>
            <div className="flex border border-slate-700 bg-white">
              {dateDigits.map((digit, i) => (
                <div
                  key={i}
                  className="w-5 h-6 flex items-center justify-center font-mono font-bold text-xs border-r last:border-r-0 border-slate-400"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payee Line */}
        <div className="mt-8 flex items-baseline">
          <span className="font-sans font-semibold text-xs tracking-wider uppercase text-slate-700 w-12 flex-shrink-0">
            Pay
          </span>
          <div className="flex-1 border-b border-slate-700 pb-1 font-bold text-base text-slate-950 font-sans flex justify-between items-baseline px-2">
            <span>{vendor ? vendor.name : 'Wholesale Distributor'}</span>
            <span className="text-xs font-serif font-normal text-slate-500">Or Bearer</span>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="mt-5 flex items-baseline">
          <span className="font-sans font-semibold text-xs tracking-wider uppercase text-slate-700 w-16 flex-shrink-0">
            Rupees
          </span>
          <div className="flex-1 border-b border-slate-700 pb-1 font-semibold text-sm text-slate-900 font-sans px-2 leading-relaxed">
            {words} ----------------------------------------------------
          </div>
        </div>

        {/* Amount in Figures Box */}
        <div className="mt-6 flex justify-end items-center gap-3">
          <span className="font-sans font-bold text-lg text-slate-800">₹</span>
          <div className="border-2 border-slate-800 bg-white px-4 py-2 font-sans font-extrabold text-base tracking-wider shadow-inner min-w-[200px] text-right">
            *** {formatINR(supply.totalAmount, true).replace('₹', '')} ***
          </div>
        </div>

        {/* Signatory & Account details */}
        <div className="mt-10 flex items-end justify-between text-xs font-sans">
          <div>
            <div className="text-[11px] text-slate-600 font-mono">
              A/C No: <strong className="text-slate-900">30981240951</strong>
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
              CURRENT ACCOUNT • MULTI-CITY CHEQUE
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs font-bold text-slate-800 uppercase">
              For {settings.shopName}
            </div>
            <div className="h-10"></div>
            <div className="border-t border-slate-800 pt-1 text-[11px] text-slate-600 font-medium tracking-wide">
              AUTHORISED SIGNATORY
            </div>
          </div>
        </div>

        {/* Bottom MICR Strip */}
        <div className="mt-8 pt-2 border-t border-slate-400 font-mono text-center text-xs tracking-widest text-slate-700">
          ⑈ {supply.chequeNo.replace('CHQ-', '')} ⑈ 411002015 ⑈ 001234 ⑈ 10
        </div>
      </div>
    </div>
  );
}
