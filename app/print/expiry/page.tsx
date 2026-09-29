'use client';

import React, { useMemo } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { getExpiredBatchDetails, groupExpiredBatchesByVendor } from '@/lib/services/expiry';
import { formatDate, formatINR } from '@/lib/formatters';
import { PrintToolbar } from '@/components/layout/PrintToolbar';

export default function PrintExpiryPage() {
  const { batches, medicines, vendors, settings } = useAppStore();
  const today = useMemo(() => new Date(), []);

  const expiredDetails = useMemo(() => {
    return getExpiredBatchDetails(batches, medicines, vendors, today);
  }, [batches, medicines, vendors, today]);

  const vendorGroups = useMemo(() => {
    return groupExpiredBatchesByVendor(expiredDetails, vendors);
  }, [expiredDetails, vendors]);

  const grandTotalReturnValue = useMemo(() => {
    return expiredDetails.reduce((sum, d) => sum + d.estimatedLoss, 0);
  }, [expiredDetails]);

  return (
    <div className="min-h-screen bg-slate-100/60 pb-12 print:bg-white print:pb-0">
      <PrintToolbar title="Expired Stock Replacement Debit Memo" />

      <div className="max-w-4xl mx-auto my-6 p-6 print:m-0 print:p-0 space-y-8">
        {expiredDetails.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
            No expired batches currently in inventory.
          </div>
        ) : (
          <div className="bg-white border border-slate-300 p-8 rounded-xl shadow-md print:shadow-none print:border-none print:p-0 print:m-0 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <div className="text-[10px] font-mono uppercase font-bold tracking-widest text-rose-700">
                  EXPIRED STOCK QUARANTINE & REPLACEMENT MEMO
                </div>
                <h1 className="text-xl font-extrabold uppercase text-slate-900">
                  {settings.shopName}
                </h1>
                <p className="text-xs text-slate-600">{settings.shopAddress}</p>
                <p className="text-xs text-slate-600 font-medium">
                  Phone: {settings.shopPhone} {settings.shopGst && `• GST: ${settings.shopGst}`}
                </p>
              </div>

              <div className="text-right text-xs">
                <div className="font-bold text-slate-900 text-sm">
                  MEMO NO: EXP-{formatDate(today).replace(/ /g, '')}
                </div>
                <div className="text-slate-600">Audit Date: {formatDate(today)}</div>
                <div className="text-rose-700 font-bold mt-1">Status: Quarantined for Return</div>
              </div>
            </div>

            {/* Notice statement */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 leading-relaxed">
              <strong>Notice to Wholesale Distributors:</strong> The following drug batches have exceeded their registered shelf life and have been segregated from active retail dispensing. Please accept these goods for credit note issuance or physical batch replacement per state pharmacy licensing norms.
            </div>

            {/* Vendor Sections */}
            <div className="space-y-6">
              {vendorGroups.map((group) => (
                <div key={group.vendor.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="p-3 bg-slate-100 flex justify-between items-center text-xs font-bold border-b border-slate-200">
                    <div>
                      <span>Distributor: </span>
                      <span className="text-slate-900">{group.vendor.name}</span>
                      <span className="text-slate-500 font-normal ml-2">({group.vendor.address})</span>
                    </div>
                    <div className="text-rose-700 font-extrabold">
                      Return Value: {formatINR(group.totalReturnValue)}
                    </div>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-mono text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Batch No</th>
                        <th className="py-2 px-3">Medicine Description</th>
                        <th className="py-2 px-3">Expiry Date</th>
                        <th className="py-2 px-3 text-right">Quantity</th>
                        <th className="py-2 px-3 text-right">Purchase Rate</th>
                        <th className="py-2 px-3 text-right">Total Debit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item) => (
                        <tr key={item.batch.id}>
                          <td className="py-2 px-3 font-mono font-bold text-rose-700">
                            {item.batch.batchNo}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900">{item.medicine.tradeName}</span>
                            <span className="text-[10px] text-slate-500 block">
                              {item.medicine.code} • {item.medicine.genericName}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-medium">
                            {formatDate(item.batch.expiryDate)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {item.batch.quantity} units
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {formatINR(item.medicine.purchasePrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatINR(item.estimatedLoss)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Grand Total */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-sm font-bold">
              <span>TOTAL VALUE OF EXPIRED STOCK RETURNED:</span>
              <span className="text-xl font-extrabold text-rose-800">
                {formatINR(grandTotalReturnValue)}
              </span>
            </div>

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-xs border-t border-slate-200">
              <div className="space-y-12">
                <div className="text-slate-600">Dispensing Pharmacist / Store Incharge</div>
                <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">
                  Verified & Segregated (Signature)
                </div>
              </div>

              <div className="space-y-12 text-right">
                <div className="text-slate-600">For {settings.shopName}</div>
                <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">
                  Authorized Pharmacy Representative
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
