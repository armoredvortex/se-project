'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import {
  Settings as SettingsIcon,
  Store,
  RotateCcw,
  Database,
  Sliders,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export default function SettingsPage() {
  const { settings, medicines, batches, sales, supplies, vendors, updateSettings, resetDemoData } =
    useAppStore();
  const { success } = useToast();

  const [shopName, setShopName] = useState(settings.shopName);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [shopPhone, setShopPhone] = useState(settings.shopPhone);
  const [shopGst, setShopGst] = useState(settings.shopGst || '');
  const [salesWindowDays, setSalesWindowDays] = useState(settings.salesWindowDays);
  const [coverMultiplier, setCoverMultiplier] = useState(settings.coverMultiplier);

  const [resetModalOpen, setResetModalOpen] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      shopName: shopName.trim(),
      shopAddress: shopAddress.trim(),
      shopPhone: shopPhone.trim(),
      shopGst: shopGst.trim(),
      salesWindowDays: Number(salesWindowDays),
      coverMultiplier: Number(coverMultiplier),
    });
    success('Settings updated successfully');
  };

  const handleConfirmReset = () => {
    resetDemoData();
    // Resync local form fields with fresh seed
    const fresh = useAppStore.getState().settings;
    setShopName(fresh.shopName);
    setShopAddress(fresh.shopAddress);
    setShopPhone(fresh.shopPhone);
    setShopGst(fresh.shopGst || '');
    setSalesWindowDays(fresh.salesWindowDays);
    setCoverMultiplier(fresh.coverMultiplier);

    setResetModalOpen(false);
    success('Demo database reset and reseeded with realistic Indian pharmacy data!');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-emerald-600" />
          <span>Shop Configuration & Storage</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize retail pharmacy branding, default analytical parameters, and manage browser storage.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Store Profile Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-emerald-600" />
            <span>Store Profile & Bill Header</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop / Pharmacy Trade Name *
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Physical Address *
              </label>
              <input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Contact *
              </label>
              <input
                type="text"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN / Drug License No.
              </label>
              <input
                type="text"
                value={shopGst}
                onChange={(e) => setShopGst(e.target.value)}
                placeholder="27AABCS1429B1Z2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Reorder Strategy Defaults */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-3 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-emerald-600" />
            <span>Default Reorder Strategy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Sales Window (Days)
              </label>
              <input
                type="number"
                min="7"
                max="90"
                value={salesWindowDays}
                onChange={(e) => setSalesWindowDays(parseInt(e.target.value || '28', 10))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Number of days over which weekly average sales velocity is measured (Default: 28).
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Cover Multiplier
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="5.0"
                value={coverMultiplier}
                onChange={(e) => setCoverMultiplier(parseFloat(e.target.value || '1.0'))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Weeks of stock cover to order when inventory falls below threshold (Default: 1.0).
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </form>

      {/* Storage Architecture & Diagnostics */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-3 border-b border-slate-100">
          <Database className="w-5 h-5 text-emerald-600" />
          <span>Browser Persistence Status</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xl font-bold text-slate-900">{medicines.length}</div>
            <div className="text-[11px] text-slate-500">Medicines</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xl font-bold text-slate-900">{batches.length}</div>
            <div className="text-[11px] text-slate-500">Stock Batches</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xl font-bold text-slate-900">{vendors.length}</div>
            <div className="text-[11px] text-slate-500">Vendors</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xl font-bold text-slate-900">{sales.length}</div>
            <div className="text-[11px] text-slate-500">Sales Memos</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
            <div className="text-xl font-bold text-slate-900">{supplies.length}</div>
            <div className="text-[11px] text-slate-500">Supplies</div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p>
            All records are preserved in local browser storage via Zustand repository middleware (<code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">/lib/store</code>). No external server database or API credentials needed.
          </p>
        </div>
      </div>

      {/* Danger Zone: Reset Demo Data */}
      <div className="bg-white rounded-2xl border border-rose-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-rose-800 font-bold text-base pb-3 border-b border-rose-100">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>Reset Demo Environment</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900">Reset & Reseed Demo Data</h4>
            <p className="text-xs text-slate-500 max-w-lg">
              Clears current browser storage and re-generates reproducible demo inventory with 25 Indian medicines, 5 vendors, multi-batch expiry cases, and 6 weeks of sales history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all flex-shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Demo Data?"
        description="This will clear your local storage and regenerate clean seed inventory."
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            All your current local transactions, custom medicines, and stock adjustments will be replaced with fresh seed data relative to today. Are you sure you want to proceed?
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReset}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm"
            >
              Yes, Reset Everything
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
