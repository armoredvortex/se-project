'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store/useAppStore';
import { Vendor } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Users, Plus, Edit2, Truck, Phone, MapPin, Check } from 'lucide-react';

export default function VendorsPage() {
  const { vendors, medicines, addVendor, updateVendor } = useAppStore();
  const { success } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedMedicineIds, setSelectedMedicineIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingVendor(null);
    setName('');
    setAddress('');
    setPhone('');
    setSelectedMedicineIds([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setName(vendor.name);
    setAddress(vendor.address);
    setPhone(vendor.phone || '');
    setSelectedMedicineIds([...vendor.medicineIds]);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Vendor name is required');
      return;
    }
    if (!address.trim()) {
      setFormError('Vendor address is required');
      return;
    }

    if (editingVendor) {
      updateVendor(editingVendor.id, {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        medicineIds: selectedMedicineIds,
      });
      success(`Vendor "${name}" updated successfully`);
    } else {
      addVendor({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        medicineIds: selectedMedicineIds,
      });
      success(`Vendor "${name}" created successfully`);
    }

    setIsModalOpen(false);
  };

  const toggleMedicine = (medId: string) => {
    if (selectedMedicineIds.includes(medId)) {
      setSelectedMedicineIds(selectedMedicineIds.filter((id) => id !== medId));
    } else {
      setSelectedMedicineIds([...selectedMedicineIds, medId]);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-600" />
            <span>Pharma Distributors & Vendors</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain wholesale supplier contacts and linked medicine catalogs for procurement and reorders.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Distributor</span>
        </button>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => {
          const suppliedMedicines = medicines.filter((m) => vendor.medicineIds.includes(m.id));

          return (
            <div
              key={vendor.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {vendor.name}
                  </h3>
                  <button
                    onClick={() => openEditModal(vendor)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                    title="Edit Vendor"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{vendor.address}</span>
                  </div>
                  {vendor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                </div>

                {/* Supplied Medicines Tags */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-slate-700">Supplies:</span>
                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                      {suppliedMedicines.length} medicines
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {suppliedMedicines.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No linked medicines yet.</span>
                    ) : (
                      suppliedMedicines.slice(0, 8).map((m) => (
                        <span
                          key={m.id}
                          className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium"
                        >
                          {m.tradeName.split(' ')[0]}
                        </span>
                      ))
                    )}
                    {suppliedMedicines.length > 8 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md">
                        +{suppliedMedicines.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href={`/supply?vendorId=${vendor.id}`}
                  className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Receive Supply</span>
                </Link>
                <button
                  onClick={() => openEditModal(vendor)}
                  className="text-slate-500 hover:text-slate-700 font-medium"
                >
                  Manage medicines
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Vendor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? `Edit ${editingVendor.name}` : 'Add Distributor / Vendor'}
        description="Configure vendor contact details and select all medicines this vendor deals with."
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Distributor / Vendor Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Apex Healthcare Distributors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Address & City *
            </label>
            <input
              type="text"
              placeholder="e.g. Plot 42, MIDC Industrial Area, Andheri (E), Mumbai - 400093"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number / Contact
            </label>
            <input
              type="text"
              placeholder="+91 98200 12345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Medicines Multi-Select Grid */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Medicines Supplied by this Vendor ({selectedMedicineIds.length} selected)
              </label>
              <div className="text-[11px] space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedMedicineIds(medicines.map((m) => m.id))}
                  className="text-emerald-700 hover:underline font-medium"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMedicineIds([])}
                  className="text-slate-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50">
              {medicines.map((med) => {
                const isSelected = selectedMedicineIds.includes(med.id);
                return (
                  <div
                    key={med.id}
                    onClick={() => toggleMedicine(med.id)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold truncate">{med.tradeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{med.code}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              {editingVendor ? 'Save Changes' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
