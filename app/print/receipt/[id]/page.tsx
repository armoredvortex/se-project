'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatDateTime, formatINR } from '@/lib/formatters';
import { numberToWordsIndian } from '@/lib/services/numberToWords';
import { PrintToolbar } from '@/components/layout/PrintToolbar';
import { Barcode } from '@/components/ui/Barcode';

export default function PrintReceiptPage() {
  const params = useParams();
  const saleId = params.id as string;

  const { sales, medicines, settings } = useAppStore();

  const sale = useMemo(() => {
    return sales.find((s) => s.id === saleId);
  }, [sales, saleId]);

  const medicineMap = useMemo(() => {
    return new Map(medicines.map((m) => [m.id, m]));
  }, [medicines]);

  if (!sale) {
    return (
      <div className="p-8 text-center text-slate-500">
        <PrintToolbar title="Receipt Not Found" />
        <div className="mt-12 text-slate-700 font-bold">Sale receipt not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 pb-12 print:bg-white print:pb-0">
      <PrintToolbar title={`Cash Memo: ${sale.receiptNo}`} />

      {/* Printable Receipt Paper Container */}
      <div className="max-w-md mx-auto my-6 p-6 sm:p-8 bg-white border border-slate-300 shadow-lg rounded-xl print:shadow-none print:border-none print:m-0 print:p-0 font-sans text-slate-900">
        {/* Header */}
        <div className="text-center pb-4 border-b border-slate-900/40 space-y-1">
          <div className="text-[10px] tracking-widest uppercase font-mono font-bold text-slate-500">
            RETAIL CASH MEMO
          </div>
          <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">
            {settings.shopName}
          </h1>
          <p className="text-xs text-slate-600">{settings.shopAddress}</p>
          <p className="text-xs text-slate-600 font-medium">
            Phone: {settings.shopPhone} {settings.shopGst && `• GSTIN: ${settings.shopGst}`}
          </p>
        </div>

        {/* Metadata */}
        <div className="py-3 border-b border-dashed border-slate-400 text-xs flex justify-between">
          <div>
            <div>
              Receipt No: <strong className="font-mono">{sale.receiptNo}</strong>
            </div>
            <div>Patient/Customer: Walk-in Cash Sale</div>
          </div>
          <div className="text-right">
            <div>Date: {formatDateTime(sale.createdAt)}</div>
            <div>Cashier: Counter 1</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-3 border-b border-slate-900/40">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 uppercase font-mono text-[10px] text-slate-600">
                <th className="py-1">Description</th>
                <th className="py-1">Batch</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Rate</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item, idx) => {
                const med = medicineMap.get(item.medicineId);
                const lineTotal = item.quantity * item.unitPrice;

                return (
                  <tr key={idx} className="py-1.5">
                    <td className="py-1.5 pr-2">
                      <div className="font-bold text-slate-900">
                        {med ? med.tradeName : 'Medicine'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {med?.code} • Rack {med?.rackNo}
                      </div>
                    </td>
                    <td className="py-1.5 font-mono text-[11px] text-slate-600">
                      {item.batchNo}
                    </td>
                    <td className="py-1.5 text-right font-semibold">{item.quantity}</td>
                    <td className="py-1.5 text-right text-slate-600">
                      {formatINR(item.unitPrice, false)}
                    </td>
                    <td className="py-1.5 text-right font-bold text-slate-900">
                      {formatINR(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Total & Words */}
        <div className="py-3 border-b border-dashed border-slate-400 space-y-2">
          <div className="flex justify-between items-baseline text-sm font-bold">
            <span>NET AMOUNT PAYABLE:</span>
            <span className="text-lg font-extrabold text-slate-950">
              {formatINR(sale.totalAmount)}
            </span>
          </div>
          <div className="text-[11px] text-slate-700 italic leading-snug">
            {numberToWordsIndian(sale.totalAmount)}
          </div>
        </div>

        {/* Barcode & Footer notes */}
        <div className="pt-4 text-center space-y-2">
          <Barcode value={sale.receiptNo} height={32} />
          <p className="text-[10px] text-slate-500 leading-tight">
            * Medicines sold under prescription. Store in cool, dry place.<br />
            Goods once sold cannot be returned without original cash memo.<br />
            Thank you! Get well soon!
          </p>
        </div>
      </div>
    </div>
  );
}
