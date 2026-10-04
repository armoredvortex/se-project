'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Truck,
  Search,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Package,
  Clock,
  ArrowRight,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatDate, formatINR, isBatchExpired, isExpiringSoon } from '@/lib/formatters';
import { calculateReorderReport } from '@/lib/services/reorder';
import { calculateFinancials } from '@/lib/services/finance';
import { Badge } from '@/components/ui/Badge';
import { startOfDay, startOfMonth } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const medicines = useAppStore((s) => s.medicines);
  const batches = useAppStore((s) => s.batches);
  const sales = useAppStore((s) => s.sales);
  const supplies = useAppStore((s) => s.supplies);
  const settings = useAppStore((s) => s.settings);

  const [globalSearch, setGlobalSearch] = useState('');

  // 1. Today's sales
  const today = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => startOfDay(today), [today]);

  const todayStats = useMemo(() => {
    const todaySales = sales.filter((s) => new Date(s.createdAt) >= todayStart);
    const totalRev = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    return { count: todaySales.length, revenue: totalRev };
  }, [sales, todayStart]);

  // 2. Low stock count via reorder report
  const reorderReport = useMemo(() => {
    return calculateReorderReport(
      { medicines, vendors: [], batches, supplies, sales, settings, counters: { nextMedicineNo: 0, nextChequeNo: 0, nextReceiptNo: 0 } },
      settings.salesWindowDays,
      settings.coverMultiplier,
      today
    );
  }, [medicines, batches, supplies, sales, settings, today]);

  // 3. Expired batches count
  const expiredBatchesCount = useMemo(() => {
    return batches.filter((b) => b.quantity > 0 && isBatchExpired(b.expiryDate, today)).length;
  }, [batches, today]);

  // 4. Month Profit
  const monthFinancials = useMemo(() => {
    const monthStart = startOfMonth(today);
    return calculateFinancials(sales, supplies, [], monthStart, today);
  }, [sales, supplies, today]);

  // Global search filtered results
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const query = globalSearch.toLowerCase().trim();
    return medicines
      .filter(
        (m) =>
          m.tradeName.toLowerCase().includes(query) ||
          m.genericName.toLowerCase().includes(query) ||
          m.code.toLowerCase().includes(query) ||
          m.rackNo.toLowerCase().includes(query)
      )
      .slice(0, 6);
  }, [medicines, globalSearch]);

  // Medicine stock map
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of batches) {
      if (b.quantity > 0 && !isBatchExpired(b.expiryDate, today)) {
        map.set(b.medicineId, (map.get(b.medicineId) || 0) + b.quantity);
      }
    }
    return map;
  }, [batches, today]);

  // Near-expiry or expired batches preview
  const attentionBatches = useMemo(() => {
    const medMap = new Map(medicines.map((m) => [m.id, m]));
    return batches
      .filter((b) => b.quantity > 0 && (isBatchExpired(b.expiryDate, today) || isExpiringSoon(b.expiryDate, 30, today)))
      .map((b) => ({
        batch: b,
        medicine: medMap.get(b.medicineId),
        isExpired: isBatchExpired(b.expiryDate, today),
      }))
      .slice(0, 5);
  }, [batches, medicines, today]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Pharmacy Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {settings.shopName} • <span className="font-medium text-slate-700">{formatDate(today)}</span>
          </p>
        </div>

        {/* Global Instant Search */}
        <div className="relative w-full sm:w-80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search medicine or generic..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100">
              {searchResults.map((med) => {
                const stock = stockMap.get(med.id) || 0;
                return (
                  <button
                    key={med.id}
                    onClick={() => {
                      setGlobalSearch('');
                      router.push(`/query?q=${encodeURIComponent(med.tradeName)}`);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between transition-colors text-xs sm:text-sm"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{med.tradeName}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1 rounded">
                          {med.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                        {med.genericName}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-medium text-emerald-700">{formatINR(med.sellingPrice)}</div>
                      <div className="text-[11px] text-slate-500">
                        Rack {med.rackNo} • <span className="font-semibold">{stock} units</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              <div className="p-2 bg-slate-50 text-center">
                <Link
                  href={`/query?q=${encodeURIComponent(globalSearch)}`}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  View all query results →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Today's Sales */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">Today&apos;s Sales</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{formatINR(todayStats.revenue)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            <strong className="text-slate-700">{todayStats.count}</strong> transactions today
          </p>
        </div>

        {/* Low Stock Alerts */}
        <Link
          href="/reorder"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">Low Stock Alert</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{reorderReport.reorderItems.length}</span>
            <span className="text-xs text-amber-600 font-medium">below threshold</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1 group-hover:text-emerald-600">
            <span>Generate purchase reorder</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </Link>

        {/* Expired Batches */}
        <Link
          href="/expiry"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">Expired Batches</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{expiredBatchesCount}</span>
            <span className="text-xs text-rose-600 font-medium">need replacement</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1 group-hover:text-rose-600">
            <span>Process vendor returns</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </Link>

        {/* Month Profit */}
        <Link
          href="/reports"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">This Month Profit</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{formatINR(monthFinancials.grossProfit)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Gross Margin: <strong className="text-emerald-600">{monthFinancials.marginPercent}%</strong>
          </p>
        </Link>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <h2 className="text-base sm:text-lg font-bold mb-3 tracking-tight">Quick Operations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link
            href="/sales"
            className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-sm transition-all text-xs sm:text-sm font-medium border border-white/10 hover:scale-[1.02]"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-300" />
            <span>New Sale (POS)</span>
          </Link>
          <Link
            href="/supply"
            className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-sm transition-all text-xs sm:text-sm font-medium border border-white/10 hover:scale-[1.02]"
          >
            <Truck className="w-4 h-4 text-emerald-300" />
            <span>Receive Supply</span>
          </Link>
          <Link
            href="/query"
            className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-sm transition-all text-xs sm:text-sm font-medium border border-white/10 hover:scale-[1.02]"
          >
            <Search className="w-4 h-4 text-emerald-300" />
            <span>Query Stock</span>
          </Link>
          <Link
            href="/reorder"
            className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-sm transition-all text-xs sm:text-sm font-medium border border-white/10 hover:scale-[1.02]"
          >
            <RefreshCw className="w-4 h-4 text-emerald-300" />
            <span>Reorder List</span>
          </Link>
          <Link
            href="/expiry"
            className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-sm transition-all text-xs sm:text-sm font-medium border border-white/10 hover:scale-[1.02] col-span-2 sm:col-span-1"
          >
            <AlertTriangle className="w-4 h-4 text-rose-300" />
            <span>Expiry Report</span>
          </Link>
        </div>
      </div>

      {/* Main Content Split: Recent Sales & Batch Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-900">Recent Sales</h2>
            </div>
            <Link href="/sales" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
              <span>Start New Sale</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-x-auto">
            {sales.slice(0, 6).map((sale) => (
              <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {sale.receiptNo}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{formatDate(sale.createdAt)}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {sale.items.length} line {sale.items.length === 1 ? 'item' : 'items'}
                    {' '}({sale.items.reduce((sum, i) => sum + i.quantity, 0)} units total)
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-900">{formatINR(sale.totalAmount)}</span>
                  <Link
                    href={`/print/receipt/${sale.id}`}
                    className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Print Cash Memo"
                  >
                    <Printer className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expiring Batches Preview (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">Batch Alerts</h2>
            </div>
            <Link href="/expiry" className="text-xs font-semibold text-rose-700 hover:text-rose-800">
              Manage →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 p-2 flex-1">
            {attentionBatches.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No expired or near-expiry batches detected.
              </div>
            ) : (
              attentionBatches.map((item) => (
                <div key={item.batch.id} className="p-3 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 truncate max-w-[170px]">
                      {item.medicine?.tradeName || 'Medicine'}
                    </div>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                      Batch {item.batch.batchNo} • {item.batch.quantity} units
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.isExpired ? 'rose' : 'amber'}>
                      {item.isExpired ? 'Expired' : 'Near Expiry'}
                    </Badge>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {formatDate(item.batch.expiryDate)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
