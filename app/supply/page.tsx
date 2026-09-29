'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatINR } from '@/lib/formatters';
import { numberToWordsIndian } from '@/lib/services/numberToWords';
import { formatChequeNo } from '@/lib/services/codegen';
import { useToast } from '@/components/ui/Toast';
import { Truck, Plus, Trash2, CheckCircle2, ArrowRight, Printer, AlertCircle } from 'lucide-react';
import { format, addYears } from 'date-fns';

interface SupplyRow {
  id: string;
  medicineId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number | '';
  unitCost: number | '';
}

function SupplyContent() {
  const searchParams = useSearchParams();
  const preselectedVendorId = searchParams.get('vendorId');

  const { vendors, medicines, counters, receiveSupply } = useAppStore();
  const { success, error } = useToast();

  const [selectedVendorId, setSelectedVendorId] = useState(preselectedVendorId || (vendors[0]?.id || ''));
  const [supplyDate, setSupplyDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (preselectedVendorId && vendors.some((v) => v.id === preselectedVendorId)) {
      setSelectedVendorId(preselectedVendorId);
    }
  }, [preselectedVendorId, vendors]);

  const selectedVendor = useMemo(() => {
    return vendors.find((v) => v.id === selectedVendorId);
  }, [vendors, selectedVendorId]);

  // Allowed medicines for this vendor
  const vendorMedicines = useMemo(() => {
    if (!selectedVendor) return [];
    return medicines.filter((m) => selectedVendor.medicineIds.includes(m.id));
  }, [medicines, selectedVendor]);

  // If vendor has no medicines linked, offer all medicines with auto-linking option
  const availableMedicines = useMemo(() => {
    return vendorMedicines.length > 0 ? vendorMedicines : medicines;
  }, [vendorMedicines, medicines]);

  const [rows, setRows] = useState<SupplyRow[]>([
    {
      id: 'row-1',
      medicineId: '',
      batchNo: '',
      expiryDate: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
      quantity: 50,
      unitCost: '',
    },
  ]);

  const [createdSupplyId, setCreatedSupplyId] = useState<string | null>(null);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        medicineId: availableMedicines[0]?.id || '',
        batchNo: '',
        expiryDate: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
        quantity: 50,
        unitCost: availableMedicines[0]?.purchasePrice || '',
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, updates: Partial<SupplyRow>) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const updated = { ...row, ...updates };

        // If medicineId changed, prefill unitCost
        if (updates.medicineId && updates.medicineId !== row.medicineId) {
          const med = medicines.find((m) => m.id === updates.medicineId);
          if (med) {
            updated.unitCost = med.purchasePrice;
          }
        }
        return updated;
      })
    );
  };

  // Calculate totals
  const totalAmount = useMemo(() => {
    return rows.reduce((sum, r) => {
      const q = typeof r.quantity === 'number' ? r.quantity : 0;
      const c = typeof r.unitCost === 'number' ? r.unitCost : 0;
      return sum + q * c;
    }, 0);
  }, [rows]);

  const nextChequeNumber = useMemo(() => {
    return formatChequeNo(counters.nextChequeNo);
  }, [counters.nextChequeNo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVendorId) {
      error('Please select a vendor/distributor');
      return;
    }

    if (rows.length === 0) {
      error('Please add at least one line item');
      return;
    }

    // Validation
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.medicineId) {
        error(`Please select a medicine in row ${i + 1}`);
        return;
      }
      if (!r.batchNo.trim()) {
        error(`Please specify a batch number in row ${i + 1}`);
        return;
      }
      if (!r.expiryDate.trim()) {
        error(`Please specify an expiry date in row ${i + 1}`);
        return;
      }
      if (typeof r.quantity !== 'number' || r.quantity <= 0) {
        error(`Quantity must be greater than 0 in row ${i + 1}`);
        return;
      }
      if (typeof r.unitCost !== 'number' || r.unitCost < 0) {
        error(`Unit purchase cost cannot be negative in row ${i + 1}`);
        return;
      }
    }

    try {
      const inputItems = rows.map((r) => ({
        medicineId: r.medicineId,
        batchNo: r.batchNo.trim().toUpperCase(),
        expiryDate: r.expiryDate.trim(),
        quantity: Number(r.quantity),
        unitCost: Number(r.unitCost),
      }));

      const supply = receiveSupply(
        selectedVendorId,
        inputItems,
        new Date(supplyDate).toISOString()
      );

      success(`Consignment received! Cheque ${supply.chequeNo} issued.`);
      setCreatedSupplyId(supply.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to receive supply consignment';
      error(msg);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Truck className="w-7 h-7 text-emerald-600" />
          <span>Receive Vendor Supply</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Inward stock consignments from distributors, update batch inventory, and auto-issue bank payment cheques.
        </p>
      </div>

      {createdSupplyId ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center max-w-xl mx-auto space-y-5 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Consignment Received!</h2>
            <p className="text-slate-500 text-sm mt-1">
              Stock has been added to inventory and cheque has been prepared.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs sm:text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Payee (Distributor):</span>
              <span className="font-semibold text-slate-900">{selectedVendor?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Invoice Amount:</span>
              <span className="font-bold text-emerald-700">{formatINR(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cheque Number:</span>
              <span className="font-mono font-bold text-slate-800">{nextChequeNumber}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/print/cheque/${createdSupplyId}`}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bank Cheque</span>
            </Link>
            <button
              onClick={() => {
                setCreatedSupplyId(null);
                setRows([
                  {
                    id: 'row-1',
                    medicineId: '',
                    batchNo: '',
                    expiryDate: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
                    quantity: 50,
                    unitCost: '',
                  },
                ]);
              }}
              className="w-full sm:w-auto px-6 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold"
            >
              Receive Another Supply
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vendor Selection Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Supplier & Consignment Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Distributor / Vendor *
                </label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.medicineIds.length} medicines)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice / Supply Date *
                </label>
                <input
                  type="date"
                  value={supplyDate}
                  onChange={(e) => setSupplyDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {selectedVendor && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{selectedVendor.name}</span> • {selectedVendor.address}
                </div>
                {vendorMedicines.length === 0 && (
                  <div className="text-amber-700 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Vendor catalog empty; all medicines shown. Inward items will be linked automatically.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lines Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Received Line Items ({rows.length})
              </h3>
              <button
                type="button"
                onClick={addRow}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[200px]">Medicine *</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Batch No. *</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Expiry Date *</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-right">Quantity *</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right">Unit Cost (₹) *</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right">Line Total</th>
                    <th className="py-2.5 px-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const lineTotal =
                      (typeof row.quantity === 'number' ? row.quantity : 0) *
                      (typeof row.unitCost === 'number' ? row.unitCost : 0);

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        {/* Medicine selector */}
                        <td className="p-2.5">
                          <select
                            value={row.medicineId}
                            onChange={(e) => updateRow(idx, { medicineId: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                          >
                            <option value="">-- Choose Medicine --</option>
                            {availableMedicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.code} - {m.tradeName} ({m.genericName.split('(')[0]})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Batch No */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            placeholder="e.g. B-2026-09"
                            value={row.batchNo}
                            onChange={(e) => updateRow(idx, { batchNo: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* Expiry Date */}
                        <td className="p-2.5">
                          <input
                            type="date"
                            value={row.expiryDate}
                            onChange={(e) => updateRow(idx, { expiryDate: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={row.quantity}
                            onChange={(e) =>
                              updateRow(idx, {
                                quantity: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                              })
                            }
                            className="w-24 px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-right font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* Unit Cost */}
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Cost"
                            value={row.unitCost}
                            onChange={(e) =>
                              updateRow(idx, {
                                unitCost: e.target.value === '' ? '' : parseFloat(e.target.value),
                              })
                            }
                            className="w-24 px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="p-2.5 text-right font-bold text-slate-800">
                          {formatINR(lineTotal)}
                        </td>

                        {/* Remove */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            disabled={rows.length === 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={addRow}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add another line</span>
              </button>
            </div>
          </div>

          {/* Payment & Cheque Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Payment & Cheque Issuance Preview
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div>
                <div className="text-xs text-slate-600">Total Consignment Payable:</div>
                <div className="text-2xl font-extrabold text-emerald-900">{formatINR(totalAmount)}</div>
                <div className="text-xs text-emerald-800 font-medium italic mt-0.5">
                  {numberToWordsIndian(totalAmount)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">Auto Cheque Sequence:</div>
                <div className="text-base font-mono font-bold text-slate-800">{nextChequeNumber}</div>
                <div className="text-xs text-slate-500">Payee: {selectedVendor?.name}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Confirm Supply & Issue Cheque</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default function SupplyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading supply...</div>}>
      <SupplyContent />
    </Suspense>
  );
}
