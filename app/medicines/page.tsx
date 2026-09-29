'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store/useAppStore';
import { Medicine } from '@/lib/types';
import { formatINR, isBatchExpired } from '@/lib/formatters';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Barcode } from '@/components/ui/Barcode';
import { Pill, Plus, Search, Printer, Edit2 } from 'lucide-react';

export default function MedicinesPage() {
  const { medicines, vendors, batches, addMedicine, updateMedicine, updateVendor } = useAppStore();
  const { success } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  // Success modal with label preview after adding
  const [justAddedMed, setJustAddedMed] = useState<Medicine | null>(null);

  // Form State
  const [tradeName, setTradeName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [rackNo, setRackNo] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  const today = useMemo(() => new Date(), []);

  // Compute live stock on hand per medicine (SUM of non-expired batches)
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of batches) {
      if (b.quantity > 0 && !isBatchExpired(b.expiryDate, today)) {
        map.set(b.medicineId, (map.get(b.medicineId) || 0) + b.quantity);
      }
    }
    return map;
  }, [batches, today]);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    if (!searchTerm.trim()) return medicines;
    const term = searchTerm.toLowerCase();
    return medicines.filter(
      (m) =>
        m.tradeName.toLowerCase().includes(term) ||
        m.genericName.toLowerCase().includes(term) ||
        m.code.toLowerCase().includes(term) ||
        m.rackNo.toLowerCase().includes(term)
    );
  }, [medicines, searchTerm]);

  const openAddModal = () => {
    setEditingMedicine(null);
    setTradeName('');
    setGenericName('');
    setSellingPrice('');
    setPurchasePrice('');
    setRackNo('');
    setSelectedVendorIds([]);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (med: Medicine) => {
    setEditingMedicine(med);
    setTradeName(med.tradeName);
    setGenericName(med.genericName);
    setSellingPrice(med.sellingPrice.toString());
    setPurchasePrice(med.purchasePrice.toString());
    setRackNo(med.rackNo);
    const linked = vendors.filter((v) => v.medicineIds.includes(med.id)).map((v) => v.id);
    setSelectedVendorIds(linked);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!tradeName.trim()) {
      setFormError('Trade name is required');
      return;
    }
    if (!genericName.trim()) {
      setFormError('Generic name is required');
      return;
    }
    const sell = parseFloat(sellingPrice);
    const buy = parseFloat(purchasePrice);

    if (isNaN(sell) || sell <= 0) {
      setFormError('Selling price must be greater than zero');
      return;
    }
    if (isNaN(buy) || buy < 0) {
      setFormError('Purchase price must be a positive number');
      return;
    }
    if (!rackNo.trim()) {
      setFormError('Rack number is required');
      return;
    }

    if (editingMedicine) {
      updateMedicine(editingMedicine.id, {
        tradeName: tradeName.trim(),
        genericName: genericName.trim(),
        sellingPrice: sell,
        purchasePrice: buy,
        rackNo: rackNo.trim().toUpperCase(),
      });

      // Update vendors
      vendors.forEach((v) => {
        const isSelected = selectedVendorIds.includes(v.id);
        const hasMed = v.medicineIds.includes(editingMedicine.id);
        if (isSelected && !hasMed) {
          updateVendor(v.id, { medicineIds: [...v.medicineIds, editingMedicine.id] });
        } else if (!isSelected && hasMed) {
          updateVendor(v.id, { medicineIds: v.medicineIds.filter((id) => id !== editingMedicine.id) });
        }
      });

      success(`Medicine "${tradeName}" updated successfully`);
      setIsAddModalOpen(false);
    } else {
      const newMed = addMedicine({
        tradeName: tradeName.trim(),
        genericName: genericName.trim(),
        sellingPrice: sell,
        purchasePrice: buy,
        rackNo: rackNo.trim().toUpperCase(),
      });

      // Update vendor links
      selectedVendorIds.forEach((vId) => {
        const v = vendors.find((vend) => vend.id === vId);
        if (v && !v.medicineIds.includes(newMed.id)) {
          updateVendor(vId, { medicineIds: [...v.medicineIds, newMed.id] });
        }
      });

      success(`Created medicine ${newMed.code}`);
      setIsAddModalOpen(false);
      setJustAddedMed(newMed);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Pill className="w-7 h-7 text-emerald-600" />
            <span>Medicine Inventory</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage medicines, prices, rack locations, and print shelf barcode labels.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Medicine</span>
        </button>
      </div>

      {/* Search & Statistics Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, generic, code, or rack..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600">
          <div>
            Total: <strong className="text-slate-900 font-semibold">{medicines.length}</strong> items
          </div>
          <div>•</div>
          <div>
            Showing: <strong className="text-slate-900 font-semibold">{filteredMedicines.length}</strong>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Trade Name</th>
                <th className="py-3 px-4">Generic Composition</th>
                <th className="py-3 px-4">Rack</th>
                <th className="py-3 px-4 text-right">Selling (MRP)</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4">Vendors</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No medicines matching your search.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((med) => {
                  const stock = stockMap.get(med.id) || 0;
                  const medVendors = vendors.filter((v) => v.medicineIds.includes(med.id));
                  const marginPct =
                    med.sellingPrice > 0
                      ? (((med.sellingPrice - med.purchasePrice) / med.sellingPrice) * 100).toFixed(0)
                      : '0';

                  return (
                    <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {med.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {med.tradeName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-[220px] truncate" title={med.genericName}>
                        {med.genericName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 border border-slate-200">
                          {med.rackNo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                        {formatINR(med.sellingPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500">
                        {formatINR(med.purchasePrice)}
                        <span className="text-[10px] text-emerald-600 block">+{marginPct}% margin</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={stock === 0 ? 'rose' : stock < 15 ? 'amber' : 'emerald'}>
                          {stock} units
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {medVendors.length === 0 ? (
                            <span className="text-slate-400 text-xs">Direct / None</span>
                          ) : (
                            medVendors.map((v) => (
                              <span
                                key={v.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[120px]"
                                title={v.name}
                              >
                                {v.name.split(' ')[0]}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/print/label/${med.id}`}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Print Rack Label"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(med)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Medicine Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingMedicine ? `Edit ${editingMedicine.tradeName}` : 'Add New Medicine'}
        description={
          editingMedicine
            ? 'Update medicine details and pricing'
            : 'Medicine code will be generated sequentially'
        }
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trade / Brand Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Augmentin 625 Duo"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Generic Composition *
              </label>
              <input
                type="text"
                placeholder="e.g. Amoxicillin (500mg) + Clavulanic Acid (125mg)"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price / MRP (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="204.50"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase / Cost Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="158.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rack Location Number *
              </label>
              <input
                type="text"
                placeholder="e.g. A-01, B-04, R-12"
                value={rackNo}
                onChange={(e) => setRackNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Vendor Multi-Select */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplying Vendors (Dealers)
              </label>
              <div className="border border-slate-200 rounded-lg p-3 max-h-36 overflow-y-auto space-y-2 bg-slate-50/50">
                {vendors.map((vend) => {
                  const checked = selectedVendorIds.includes(vend.id);
                  return (
                    <label key={vend.id} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setSelectedVendorIds(selectedVendorIds.filter((id) => id !== vend.id));
                          } else {
                            setSelectedVendorIds([...selectedVendorIds, vend.id]);
                          }
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-medium">{vend.name}</span>
                      <span className="text-[11px] text-slate-400">({vend.address.split(',')[0]})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              {editingMedicine ? 'Save Changes' : 'Create Medicine'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Just Added Success Modal with Printable Rack Label */}
      {justAddedMed && (
        <Modal
          isOpen={!!justAddedMed}
          onClose={() => setJustAddedMed(null)}
          title="Medicine Created Successfully!"
          description="Your medicine code has been assigned. You can print the shelf rack label now."
          maxWidth="md"
        >
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center text-center space-y-3">
            <div className="text-xs uppercase font-semibold tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Rack Label Preview
            </div>

            <div className="w-full bg-white p-4 rounded-lg border-2 border-dashed border-slate-300 text-slate-900 shadow-sm">
              <div className="flex justify-between items-start text-xs border-b pb-2 mb-2">
                <span className="font-bold text-slate-800 tracking-wider font-mono">{justAddedMed.code}</span>
                <span className="bg-slate-900 text-white font-mono font-bold px-1.5 py-0.5 rounded text-[11px]">
                  RACK {justAddedMed.rackNo}
                </span>
              </div>
              <div className="font-bold text-sm text-slate-900 truncate">{justAddedMed.tradeName}</div>
              <div className="text-[11px] text-slate-500 truncate">{justAddedMed.genericName}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700">MRP {formatINR(justAddedMed.sellingPrice)}</span>
                <Barcode value={justAddedMed.code} height={28} showValue={false} />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              onClick={() => setJustAddedMed(null)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-lg"
            >
              Done
            </button>
            <Link
              href={`/print/label/${justAddedMed.id}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print Rack Label</span>
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
