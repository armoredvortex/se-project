'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatDate, formatINR, isBatchExpired, isExpiringSoon } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Search, ShoppingCart, Printer, Layers } from 'lucide-react';

function QueryContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const { medicines, batches, vendors } = useAppStore();
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  useEffect(() => {
    if (initialQuery) {
      setSearchTerm(initialQuery);
    }
  }, [initialQuery]);

  const today = useMemo(() => new Date(), []);
  const vendorMap = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);

  // Filter medicines by trade name OR generic name (partial, case-insensitive)
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return medicines;

    return medicines.filter(
      (m) =>
        m.tradeName.toLowerCase().includes(term) ||
        m.genericName.toLowerCase().includes(term) ||
        m.code.toLowerCase().includes(term) ||
        m.rackNo.toLowerCase().includes(term)
    );
  }, [medicines, searchTerm]);

  // Group batches by medicineId
  const batchesByMedicine = useMemo(() => {
    const map = new Map<string, typeof batches>();
    for (const b of batches) {
      const list = map.get(b.medicineId) || [];
      list.push(b);
      map.set(b.medicineId, list);
    }
    return map;
  }, [batches]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Search className="w-7 h-7 text-emerald-600" />
          <span>Medicine & Stock Query</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Instant case-insensitive lookup by trade name or generic formula with rack position and full batch breakdown.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
          Search Medicine (Trade Name or Generic Composition)
        </label>
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type e.g. 'Dolo', 'Paracetamol', 'Augmentin', 'Amoxicillin', 'A-01'..."
            autoFocus
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Found {searchResults.length} matching medicines</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-emerald-700 hover:underline font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {searchResults.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
            <Search className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No medicines found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No matching records for &quot;{searchTerm}&quot;. Check spelling or search by generic molecule name.
            </p>
          </div>
        ) : (
          searchResults.map((med) => {
            const medBatches = batchesByMedicine.get(med.id) || [];
            // Sort batches: earliest expiry first
            const sortedBatches = [...medBatches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

            // Compute non-expired stock
            const nonExpiredStock = sortedBatches
              .filter((b) => b.quantity > 0 && !isBatchExpired(b.expiryDate, today))
              .reduce((sum, b) => sum + b.quantity, 0);

            const expiredStock = sortedBatches
              .filter((b) => b.quantity > 0 && isBatchExpired(b.expiryDate, today))
              .reduce((sum, b) => sum + b.quantity, 0);

            return (
              <div
                key={med.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Medicine Header Bar */}
                <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                        {med.code}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">{med.tradeName}</h3>
                      <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                        RACK {med.rackNo}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Generic: <span className="text-slate-800">{med.genericName}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Stock pill */}
                    <div className="text-right">
                      <div className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                        Available Stock
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 flex items-center gap-1.5 justify-end">
                        <span className={nonExpiredStock === 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {nonExpiredStock}
                        </span>
                        <span className="text-xs font-normal text-slate-500">units</span>
                      </div>
                      {expiredStock > 0 && (
                        <div className="text-[11px] text-rose-600 font-medium">
                          +{expiredStock} expired (quarantined)
                        </div>
                      )}
                    </div>

                    {/* Price and actions */}
                    <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                      <div className="text-right mr-2 hidden sm:block">
                        <div className="text-[11px] uppercase font-semibold text-slate-400">MRP</div>
                        <div className="text-sm font-bold text-slate-900">{formatINR(med.sellingPrice)}</div>
                      </div>
                      <Link
                        href={`/sales?code=${med.code}`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Sell</span>
                      </Link>
                      <Link
                        href={`/print/label/${med.id}`}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                        title="Print Rack Label"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Batch Breakdown Section */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Batch Inventory Breakdown</span>
                    </h4>
                    <span className="text-xs text-slate-400">
                      FEFO Priority (earliest expiring used first)
                    </span>
                  </div>

                  {sortedBatches.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">
                      No stock batches recorded for this medicine yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[11px] text-slate-500 uppercase bg-slate-50/70 border-b border-slate-100">
                          <tr>
                            <th className="py-2 px-3">Batch No</th>
                            <th className="py-2 px-3">Expiry Date</th>
                            <th className="py-2 px-3 text-right">Quantity Present</th>
                            <th className="py-2 px-3">Supplier / Vendor</th>
                            <th className="py-2 px-3 text-center">Batch Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedBatches.map((b) => {
                            const isExp = isBatchExpired(b.expiryDate, today);
                            const isNear = isExpiringSoon(b.expiryDate, 30, today);
                            const vendor = vendorMap.get(b.vendorId);

                            return (
                              <tr
                                key={b.id}
                                className={`transition-colors ${
                                  isExp
                                    ? 'bg-rose-50/40 text-rose-900'
                                    : isNear
                                    ? 'bg-amber-50/40 text-amber-950'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="py-2.5 px-3 font-mono font-bold">{b.batchNo}</td>
                                <td className="py-2.5 px-3 font-medium">
                                  {formatDate(b.expiryDate)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold">
                                  <span className={b.quantity === 0 ? 'text-slate-400' : ''}>
                                    {b.quantity} units
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {vendor ? vendor.name : 'Unknown Distributor'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {b.quantity === 0 ? (
                                    <Badge variant="slate">Depleted</Badge>
                                  ) : isExp ? (
                                    <Badge variant="rose">Expired</Badge>
                                  ) : isNear ? (
                                    <Badge variant="amber">Expiring Soon</Badge>
                                  ) : (
                                    <Badge variant="emerald">Healthy</Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function QueryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading query...</div>}>
      <QueryContent />
    </Suspense>
  );
}
