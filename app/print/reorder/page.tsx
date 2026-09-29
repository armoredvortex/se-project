'use client';

import React, { useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { calculateReorderReport } from '@/lib/services/reorder';
import { formatDate, formatINR } from '@/lib/formatters';
import { PrintToolbar } from '@/components/layout/PrintToolbar';

function PrintReorderContent() {
  const searchParams = useSearchParams();
  const windowDays = parseInt(searchParams.get('window') || '28', 10);
  const coverMultiplier = parseFloat(searchParams.get('multiplier') || '1.0');

  const { medicines, vendors, batches, supplies, sales, settings, counters } = useAppStore();
  const today = useMemo(() => new Date(), []);

  const { vendorGroups } = useMemo(() => {
    return calculateReorderReport(
      { medicines, vendors, batches, supplies, sales, settings, counters, bannerDismissed: false },
      windowDays,
      coverMultiplier,
      today
    );
  }, [medicines, vendors, batches, supplies, sales, settings, counters, windowDays, coverMultiplier, today]);

  return (
    <div className="min-h-screen bg-slate-100/60 pb-12 print:bg-white print:pb-0">
      <PrintToolbar title={`Purchase Reorder Sheets (${vendorGroups.length} Vendors)`} />

      <div className="max-w-4xl mx-auto my-6 p-6 print:m-0 print:p-0 space-y-8">
        {vendorGroups.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
            No items currently below reorder threshold.
          </div>
        ) : (
          vendorGroups.map((group, gIdx) => (
            <div
              key={group.vendor.id}
              className="bg-white border border-slate-300 p-8 rounded-xl shadow-md print:shadow-none print:border-none print:p-0 print:m-0 page-break-after"
              style={{ pageBreakAfter: gIdx < vendorGroups.length - 1 ? 'always' : 'auto' }}
            >
              {/* Pharmacy & PO Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase font-bold tracking-widest text-slate-500">
                    PURCHASE REORDER INDENT
                  </div>
                  <h1 className="text-xl font-extrabold uppercase text-slate-900">
                    {settings.shopName}
                  </h1>
                  <p className="text-xs text-slate-600">{settings.shopAddress}</p>
                  <p className="text-xs text-slate-600 font-medium">Phone: {settings.shopPhone}</p>
                </div>

                <div className="text-right text-xs">
                  <div className="font-bold text-slate-900 text-sm">
                    PO NO: PO-{formatDate(today).replace(/ /g, '')}-{gIdx + 1}
                  </div>
                  <div className="text-slate-600">Date: {formatDate(today)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Buffer: {windowDays}d window × {coverMultiplier}x cover
                  </div>
                </div>
              </div>

              {/* Vendor Address Block */}
              <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Distributor (Supplier):
                  </span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{group.vendor.name}</div>
                  <div className="text-slate-600">{group.vendor.address}</div>
                </div>
                {group.vendor.phone && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Contact:
                    </span>
                    <div className="text-slate-700 font-medium">{group.vendor.phone}</div>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="my-4">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 uppercase font-mono text-[10px] text-slate-700 border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3 w-8">#</th>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-center">Rack</th>
                      <th className="py-2 px-3 text-right">In Stock</th>
                      <th className="py-2 px-3 text-right">Weekly Velocity</th>
                      <th className="py-2 px-3 text-right font-bold text-slate-950">
                        Order Qty
                      </th>
                      <th className="py-2 px-3 text-right">Unit Rate</th>
                      <th className="py-2 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {group.items.map((item, idx) => {
                      const cost = item.orderQty * item.medicine.purchasePrice;
                      return (
                        <tr key={item.medicine.id}>
                          <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-700">
                            {item.medicine.code}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900">
                              {item.medicine.tradeName}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                              {item.medicine.genericName}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">{item.medicine.rackNo}</td>
                          <td className="py-2 px-3 text-right">{item.currentStock}</td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {item.weeklyAvgSales} /wk
                          </td>
                          <td className="py-2 px-3 text-right font-extrabold text-slate-950">
                            {item.orderQty} units
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {formatINR(item.medicine.purchasePrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatINR(cost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={6} className="py-2.5 px-3 text-right text-slate-700">
                        ESTIMATED ORDER TOTAL:
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-950">
                        {group.items.reduce((s, i) => s + i.orderQty, 0)} units
                      </td>
                      <td className="py-2.5 px-3"></td>
                      <td className="py-2.5 px-3 text-right text-slate-950 text-sm">
                        {formatINR(group.totalEstimatedCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="mt-12 flex justify-between items-end text-xs pt-4 border-t border-slate-200">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Prepared by: Store In-Charge</div>
                  <div className="text-[10px] text-slate-400">Please supply goods with batch analysis reports.</div>
                </div>

                <div className="text-right space-y-8">
                  <div className="text-slate-800 font-bold">For {settings.shopName}</div>
                  <div className="border-t border-slate-700 pt-1 text-[11px] text-slate-600 font-medium">
                    AUTHORIZED PURCHASER SIGNATURE
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function PrintReorderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading reorder sheet...</div>}>
      <PrintReorderContent />
    </Suspense>
  );
}
