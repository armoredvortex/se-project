'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store/useAppStore';
import { calculateReorderReport } from '@/lib/services/reorder';
import { formatINR } from '@/lib/formatters';
import { useToast } from '@/components/ui/Toast';
import {
  RefreshCw,
  Printer,
  Sliders,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export default function ReorderPage() {
  const { medicines, vendors, batches, supplies, sales, settings, counters, updateSettings } = useAppStore();
  const { success } = useToast();

  const [windowDays, setWindowDays] = useState(settings.salesWindowDays || 28);
  const [coverMultiplier, setCoverMultiplier] = useState(settings.coverMultiplier || 1.0);

  const today = useMemo(() => new Date(), []);

  // Compute reorder suggestions grouped by vendor
  const { reorderItems, vendorGroups } = useMemo(() => {
    return calculateReorderReport(
      { medicines, vendors, batches, supplies, sales, settings, counters },
      windowDays,
      coverMultiplier,
      today
    );
  }, [medicines, vendors, batches, supplies, sales, settings, counters, windowDays, coverMultiplier, today]);

  const totalProcurementCost = useMemo(() => {
    return vendorGroups.reduce((sum, g) => sum + g.totalEstimatedCost, 0);
  }, [vendorGroups]);

  const totalOrderUnits = useMemo(() => {
    return reorderItems.reduce((sum, i) => sum + i.orderQty, 0);
  }, [reorderItems]);

  const handleSaveDefaults = () => {
    updateSettings({
      salesWindowDays: windowDays,
      coverMultiplier: coverMultiplier,
    });
    success('Reorder parameters saved as default settings');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <RefreshCw className="w-7 h-7 text-emerald-600" />
            <span>End-of-Day Reorder Analysis</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Weekly sales velocity versus non-expired stock with automated purchase order generation grouped by distributor.
          </p>
        </div>

        <Link
          href={`/print/reorder?window=${windowDays}&multiplier=${coverMultiplier}`}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print Reorder Sheets</span>
        </Link>
      </div>

      {/* Reorder Parameter Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Reorder Calculation Parameters</span>
          </div>
          <button
            onClick={handleSaveDefaults}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
          >
            Save as default
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sales Window (Days)
            </label>
            <input
              type="number"
              min="7"
              max="90"
              value={windowDays}
              onChange={(e) => setWindowDays(Math.max(1, parseInt(e.target.value || '28', 10)))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Default: 28 days (4 weeks)
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cover Multiplier (Weeks of Buffer)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="5.0"
              value={coverMultiplier}
              onChange={(e) =>
                setCoverMultiplier(Math.max(0.1, parseFloat(e.target.value || '1.0')))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Default: 1.0 (covers 1 week average)
            </span>
          </div>

          <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Formula:</strong> Weekly Avg = Units Sold in last {windowDays}d ÷ ({windowDays}/7). If Stock &lt; Weekly Avg, Order Qty = ceil(Weekly Avg × {coverMultiplier} − Stock).
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Low-Stock Items</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{reorderItems.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Need procurement</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Units to Order</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{totalOrderUnits}</div>
          <div className="text-xs text-slate-500 mt-0.5">Units across medicines</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Estimated PO Value</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalProcurementCost)}</div>
          <div className="text-xs text-slate-500 mt-0.5">At wholesale cost price</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Target Distributors</div>
          <div className="text-2xl font-bold text-teal-700 mt-1">{vendorGroups.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Separate order sheets</div>
        </div>
      </div>

      {/* Vendor Grouped Reorder Sheets */}
      <div className="space-y-6">
        {vendorGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-800">All Stock Levels Optimal!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Every medicine in your inventory currently has sufficient non-expired stock to satisfy the weekly average sales threshold.
            </p>
          </div>
        ) : (
          vendorGroups.map((group) => (
            <div
              key={group.vendor.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Group Vendor Header */}
              <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-base font-bold text-slate-900">{group.vendor.name}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {group.vendor.address}
                    </span>
                    {group.vendor.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {group.vendor.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs text-slate-500 block">Estimated Indent Total:</span>
                  <span className="text-lg font-extrabold text-emerald-800">
                    {formatINR(group.totalEstimatedCost)}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    ({group.items.length} items to order)
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Medicine Trade Name</th>
                      <th className="py-2.5 px-4">Generic Composition</th>
                      <th className="py-2.5 px-4 text-center">Rack</th>
                      <th className="py-2.5 px-4 text-right">Non-Expired Stock</th>
                      <th className="py-2.5 px-4 text-right">Weekly Avg Sales</th>
                      <th className="py-2.5 px-4 text-right font-bold text-emerald-800">
                        Order Qty
                      </th>
                      <th className="py-2.5 px-4 text-right">Unit Cost</th>
                      <th className="py-2.5 px-4 text-right">Line Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.items.map((item) => {
                      const lineCost = item.orderQty * item.medicine.purchasePrice;
                      return (
                        <tr key={item.medicine.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {item.medicine.code}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {item.medicine.tradeName}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                            {item.medicine.genericName}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                              {item.medicine.rackNo}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`font-semibold ${
                                item.currentStock === 0 ? 'text-rose-600' : 'text-amber-700'
                              }`}
                            >
                              {item.currentStock} units
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {item.weeklyAvgSales} /wk
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-800 bg-emerald-50/40">
                            +{item.orderQty} units
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {formatINR(item.medicine.purchasePrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatINR(lineCost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Group Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href={`/supply?vendorId=${group.vendor.id}`}
                  className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
                >
                  <span>Receive consignment from this vendor →</span>
                </Link>
                <div className="text-slate-500 font-medium">
                  Subtotal: <strong className="text-slate-900">{formatINR(group.totalEstimatedCost)}</strong>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
