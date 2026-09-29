'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store/useAppStore';
import { getExpiredBatchDetails, groupExpiredBatchesByVendor } from '@/lib/services/expiry';
import { formatDate, formatINR } from '@/lib/formatters';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import {
  AlertTriangle,
  Printer,
  Trash2,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function ExpiryPage() {
  const { batches, medicines, vendors, writeOffBatches } = useAppStore();
  const { success } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'vendor'>('all');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [batchesToZero, setBatchesToZero] = useState<string[]>([]);

  const today = useMemo(() => new Date(), []);

  // Compute expired batch details
  const expiredDetails = useMemo(() => {
    return getExpiredBatchDetails(batches, medicines, vendors, today);
  }, [batches, medicines, vendors, today]);

  // Vendor grouped replacement lists
  const vendorGroups = useMemo(() => {
    return groupExpiredBatchesByVendor(expiredDetails, vendors);
  }, [expiredDetails, vendors]);

  const totalExpiredUnits = useMemo(() => {
    return expiredDetails.reduce((sum, d) => sum + d.batch.quantity, 0);
  }, [expiredDetails]);

  const totalEstimatedLoss = useMemo(() => {
    return expiredDetails.reduce((sum, d) => sum + d.estimatedLoss, 0);
  }, [expiredDetails]);

  const toggleSelectBatch = (id: string) => {
    if (selectedBatchIds.includes(id)) {
      setSelectedBatchIds(selectedBatchIds.filter((bId) => bId !== id));
    } else {
      setSelectedBatchIds([...selectedBatchIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedBatchIds.length === expiredDetails.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(expiredDetails.map((d) => d.batch.id));
    }
  };

  const handleOpenWriteOff = (targetIds: string[]) => {
    setBatchesToZero(targetIds);
    setConfirmModalOpen(true);
  };

  const executeWriteOff = () => {
    if (batchesToZero.length === 0) return;
    writeOffBatches(batchesToZero);
    success(`Successfully marked ${batchesToZero.length} expired batches as returned / written off`);
    setSelectedBatchIds([]);
    setConfirmModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-rose-600" />
            <span>Expiry & Return Reports</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            End-of-day quarantine audit of expired drug batches and vendor replacement claims.
          </p>
        </div>

        <Link
          href="/print/expiry"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print Expiry Return Memo</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Expired Batches</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{expiredDetails.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Need immediate write-off</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Expired Units</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalExpiredUnits}</div>
          <div className="text-xs text-slate-500 mt-0.5">Quarantined units</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Estimated Return Value</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{formatINR(totalEstimatedLoss)}</div>
          <div className="text-xs text-slate-500 mt-0.5">At wholesale cost price</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Vendors to Claim</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{vendorGroups.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Distributor credit notes</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'all'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All Expired Batches ({expiredDetails.length})
        </button>
        <button
          onClick={() => setActiveTab('vendor')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'vendor'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Vendor-wise Replacement Requests ({vendorGroups.length})
        </button>
      </div>

      {/* Tab 1: All Expired Batches */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">
                Selected: <strong className="text-slate-900">{selectedBatchIds.length}</strong> batches
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedBatchIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenWriteOff(selectedBatchIds)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Mark Selected Written Off ({selectedBatchIds.length})</span>
                </button>
              )}
              {expiredDetails.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenWriteOff(expiredDetails.map((d) => d.batch.id))}
                  className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors"
                >
                  Mark All Written Off
                </button>
              )}
            </div>
          </div>

          {expiredDetails.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-slate-800 font-bold text-base">No Expired Batches!</div>
              <p className="text-xs text-slate-500">
                All inventory batches are within their valid non-expired shelf life.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedBatchIds.length > 0 &&
                          selectedBatchIds.length === expiredDetails.length
                        }
                        onChange={selectAll}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                    </th>
                    <th className="py-2.5 px-3">Batch No</th>
                    <th className="py-2.5 px-3">Medicine Code & Trade Name</th>
                    <th className="py-2.5 px-3">Rack</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Days Passed</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Total Loss</th>
                    <th className="py-2.5 px-3">Distributor</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiredDetails.map((item) => {
                    const isSelected = selectedBatchIds.includes(item.batch.id);
                    const daysAgo = Math.max(
                      1,
                      differenceInDays(today, parseISO(item.batch.expiryDate))
                    );

                    return (
                      <tr
                        key={item.batch.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-rose-50/60' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectBatch(item.batch.id)}
                            className="rounded border-slate-300 text-emerald-600"
                          />
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-700">
                          {item.batch.batchNo}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{item.medicine.tradeName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.medicine.code} • {item.medicine.genericName}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                            {item.medicine.rackNo}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {formatDate(item.batch.expiryDate)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="rose">{daysAgo}d ago</Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {item.batch.quantity} units
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          {formatINR(item.medicine.purchasePrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-rose-700">
                          {formatINR(item.estimatedLoss)}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {item.vendor ? item.vendor.name : 'Unknown'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenWriteOff([item.batch.id])}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                          >
                            Write Off
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Vendor-wise Grouped Replacement Requests */}
      {activeTab === 'vendor' && (
        <div className="space-y-6">
          {vendorGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-slate-800 font-bold text-base">No Vendor Claims Pending</div>
              <p className="text-xs text-slate-500">Zero expired items from any distributor.</p>
            </div>
          ) : (
            vendorGroups.map((group) => (
              <div
                key={group.vendor.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-5 bg-gradient-to-r from-rose-50/50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-rose-600" />
                      <h3 className="text-base font-bold text-slate-900">{group.vendor.name}</h3>
                    </div>
                    <div className="text-xs text-slate-500">
                      {group.vendor.address} {group.vendor.phone && `• ${group.vendor.phone}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Total Replacement Value:</span>
                      <span className="text-lg font-extrabold text-rose-700">
                        {formatINR(group.totalReturnValue)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenWriteOff(group.items.map((i) => i.batch.id))}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Return & Write Off</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Batch No</th>
                        <th className="py-2.5 px-4">Medicine Code & Trade Name</th>
                        <th className="py-2.5 px-4">Expiry Date</th>
                        <th className="py-2.5 px-4 text-right">Quantity</th>
                        <th className="py-2.5 px-4 text-right">Purchase Price</th>
                        <th className="py-2.5 px-4 text-right">Estimated Return</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item) => (
                        <tr key={item.batch.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-rose-700">
                            {item.batch.batchNo}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{item.medicine.tradeName}</span>
                            <span className="text-[11px] text-slate-500 block font-mono">
                              {item.medicine.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {formatDate(item.batch.expiryDate)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {item.batch.quantity} units
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {formatINR(item.medicine.purchasePrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-700">
                            {formatINR(item.estimatedLoss)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Batch Write-Off / Return"
        description="This action will zero out the quantities of the selected expired batches."
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to mark <strong className="text-slate-900">{batchesToZero.length}</strong> expired batch(es) as returned to distributors or written off? Their quantity will be set to 0.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeWriteOff}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm"
            >
              Confirm Write-Off
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
