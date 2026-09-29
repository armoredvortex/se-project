'use client';

import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { calculateFinancials } from '@/lib/services/finance';
import { formatDate, formatINR } from '@/lib/formatters';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  Building2,
  Receipt,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
} from 'date-fns';

type PresetRange = 'today' | '7days' | '30days' | 'month' | 'all';

export default function ReportsPage() {
  const { sales, supplies, vendors } = useAppStore();

  const [preset, setPreset] = useState<PresetRange>('30days');

  const today = useMemo(() => new Date(), []);

  // Compute date range from preset
  const { startDate, endDate } = useMemo(() => {
    if (preset === 'today') {
      return { startDate: startOfDay(today), endDate: endOfDay(today) };
    }
    if (preset === '7days') {
      return { startDate: subDays(startOfDay(today), 7), endDate: endOfDay(today) };
    }
    if (preset === '30days') {
      return { startDate: subDays(startOfDay(today), 30), endDate: endOfDay(today) };
    }
    if (preset === 'month') {
      return { startDate: startOfMonth(today), endDate: endOfDay(today) };
    }
    return { startDate: undefined, endDate: undefined };
  }, [preset, today]);

  // Financial summary
  const summary = useMemo(() => {
    return calculateFinancials(sales, supplies, vendors, startDate, endDate);
  }, [sales, supplies, vendors, startDate, endDate]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Date Range Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            <span>Financial & Profit Reports</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze gross revenue, wholesale cost of goods sold, net pharmacy margin, and supplier remittances.
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All History' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                preset === item.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{formatINR(summary.revenue)}</div>
          <p className="text-xs text-slate-500 mt-1">
            From <strong className="text-slate-700">{summary.salesCount}</strong> sales transactions
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Cost of Goods (COGS)</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-700 mt-2">{formatINR(summary.cogs)}</div>
          <p className="text-xs text-slate-500 mt-1">Wholesale purchase inventory cost</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Profit</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">
            {formatINR(summary.grossProfit)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Revenue − COGS snapshot</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Profit Margin</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-2">
            {summary.marginPercent}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Retail margin percentage</p>
        </div>
      </div>

      {/* Daily Performance Trend Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Revenue, COGS & Profit Timeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily commercial performance over the selected window
            </p>
          </div>
        </div>

        {summary.dailyTrend.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            No sales recorded in this date range.
          </div>
        ) : (
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={summary.dailyTrend}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => formatDate(val).split(' ').slice(0, 2).join(' ')}
                  stroke="#94a3b8"
                  fontSize={11}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip
                  formatter={(value: number | string | readonly (string | number)[] | undefined) => [
                    formatINR(Number(Array.isArray(value) ? value[0] : value || 0)),
                    '',
                  ]}
                  labelFormatter={(label) => formatDate(typeof label === 'string' ? label : String(label ?? ''))}
                  contentStyle={{
                    borderRadius: '12px',
                    borderColor: '#cbd5e1',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cogs" name="COGS" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Gross Profit"
                  stroke="#0f766e"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#0f766e' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Vendor Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Distributor Procurement & Payments</h2>
          </div>
          <span className="text-xs text-slate-500">
            Total Invoiced in Period:{' '}
            <strong className="text-slate-900">
              {formatINR(summary.vendorPayments.reduce((s, v) => s + v.totalAmount, 0))}
            </strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-4">Distributor / Vendor</th>
                <th className="py-3 px-4 text-center">Consignments / Cheques</th>
                <th className="py-3 px-4">Latest Inward Date</th>
                <th className="py-3 px-4 text-right">Total Remittance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.vendorPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                    No supplier payments or supplies recorded in this period.
                  </td>
                </tr>
              ) : (
                summary.vendorPayments.map((vp) => (
                  <tr key={vp.vendorId} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{vp.vendorName}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700">
                        {vp.suppliesCount} supplies
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(vp.lastPaymentDate)}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatINR(vp.totalAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
