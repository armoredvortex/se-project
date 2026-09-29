'use client';

import React, { useMemo, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { Medicine } from '@/lib/types';
import { formatINR, isBatchExpired } from '@/lib/formatters';
import { numberToWordsIndian } from '@/lib/services/numberToWords';
import { formatReceiptNo } from '@/lib/services/codegen';
import { useToast } from '@/components/ui/Toast';
import {
  ShoppingCart,
  Trash2,
  CheckCircle2,
  Printer,
  Search,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CartLine {
  id: string;
  medicineId: string;
  quantity: number;
}

function SalesContent() {
  const searchParams = useSearchParams();
  const preselectedCode = searchParams.get('code');

  const { medicines, batches, counters, recordSale } = useAppStore();
  const { success, error } = useToast();

  const today = useMemo(() => new Date(), []);

  // Map of non-expired stock per medicine
  const nonExpiredStockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of batches) {
      if (b.quantity > 0 && !isBatchExpired(b.expiryDate, today)) {
        map.set(b.medicineId, (map.get(b.medicineId) || 0) + b.quantity);
      }
    }
    return map;
  }, [batches, today]);

  // Cart Lines State
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedMedSearch, setSelectedMedSearch] = useState('');
  const [createdSaleId, setCreatedSaleId] = useState<string | null>(null);

  // If preselected code from URL, add it to cart
  useEffect(() => {
    if (preselectedCode) {
      const match = medicines.find(
        (m) => m.code.toUpperCase() === preselectedCode.toUpperCase()
      );
      if (match) {
        setCart([{ id: `cart-${Date.now()}`, medicineId: match.id, quantity: 1 }]);
      }
    } else {
      setCart((prev) => {
        if (prev.length === 0 && medicines.length > 0) {
          const firstWithStock = medicines.find((m) => (nonExpiredStockMap.get(m.id) || 0) > 0);
          if (firstWithStock) {
            return [{ id: 'cart-1', medicineId: firstWithStock.id, quantity: 1 }];
          }
        }
        return prev;
      });
    }
  }, [preselectedCode, medicines, nonExpiredStockMap]);

  // Autocomplete search candidates
  const searchResults = useMemo(() => {
    if (!selectedMedSearch.trim()) return [];
    const term = selectedMedSearch.toLowerCase().trim();
    return medicines
      .filter(
        (m) =>
          m.tradeName.toLowerCase().includes(term) ||
          m.genericName.toLowerCase().includes(term) ||
          m.code.toLowerCase().includes(term) ||
          m.rackNo.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [medicines, selectedMedSearch]);

  const addMedicineToCart = (med: Medicine) => {
    const available = nonExpiredStockMap.get(med.id) || 0;
    if (available <= 0) {
      error(`Cannot add "${med.tradeName}": No non-expired stock available!`);
      return;
    }

    const existingIndex = cart.findIndex((c) => c.medicineId === med.id);
    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > available) {
        error(`Cannot add more "${med.tradeName}". Maximum available stock is ${available}.`);
        return;
      }
      setCart((prev) =>
        prev.map((c, i) => (i === existingIndex ? { ...c, quantity: c.quantity + 1 } : c))
      );
    } else {
      setCart((prev) => [
        ...prev,
        { id: `cart-${Date.now()}-${Math.random()}`, medicineId: med.id, quantity: 1 },
      ]);
    }

    setSelectedMedSearch('');
  };

  const updateQuantity = (index: number, newQty: number) => {
    const line = cart[index];
    const available = nonExpiredStockMap.get(line.medicineId) || 0;

    if (newQty > available) {
      error(`Cannot oversell! Only ${available} non-expired units available.`);
      newQty = available;
    }

    setCart((prev) =>
      prev.map((c, i) => (i === index ? { ...c, quantity: Math.max(1, newQty) } : c))
    );
  };

  const removeLine = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Compute FEFO batch allocation preview for each cart line
  const allocationPreview = useMemo(() => {
    const medMap = new Map(medicines.map((m) => [m.id, m]));
    return cart.map((line) => {
      const med = medMap.get(line.medicineId);
      if (!med) return { line, batchesAllocated: [], totalLinePrice: 0 };

      // Non-expired batches sorted by earliest expiry
      const eligible = batches
        .filter((b) => b.medicineId === med.id && b.quantity > 0 && !isBatchExpired(b.expiryDate, today))
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

      let remaining = line.quantity;
      const batchesAllocated: Array<{ batchNo: string; qty: number; expiry: string }> = [];

      for (const b of eligible) {
        if (remaining <= 0) break;
        const take = Math.min(b.quantity, remaining);
        batchesAllocated.push({
          batchNo: b.batchNo,
          qty: take,
          expiry: b.expiryDate,
        });
        remaining -= take;
      }

      return {
        line,
        medicine: med,
        batchesAllocated,
        totalLinePrice: line.quantity * med.sellingPrice,
        isOverselling: remaining > 0,
      };
    });
  }, [cart, medicines, batches, today]);

  const grandTotal = useMemo(() => {
    return allocationPreview.reduce((sum, item) => sum + (item.totalLinePrice || 0), 0);
  }, [allocationPreview]);

  const nextReceiptNumber = useMemo(() => {
    return formatReceiptNo(counters.nextReceiptNo);
  }, [counters.nextReceiptNo]);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      error('Please add at least one item to checkout');
      return;
    }

    // Check overselling
    for (const item of allocationPreview) {
      if (item.isOverselling) {
        error(`Insufficient stock for "${item.medicine?.tradeName}". Please adjust quantity.`);
        return;
      }
    }

    try {
      const inputItems = cart.map((c) => ({
        medicineId: c.medicineId,
        quantity: c.quantity,
      }));

      const sale = recordSale(inputItems);
      success(`Sale completed! Receipt ${sale.receiptNo} generated.`);
      setCreatedSaleId(sale.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sale checkout failed';
      error(msg);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <ShoppingCart className="w-7 h-7 text-emerald-600" />
          <span>Point of Sale (New Sale)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Dispense retail prescriptions with automated FEFO batch allocation, oversell guards, and instant cash memo receipts.
        </p>
      </div>

      {createdSaleId ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center max-w-xl mx-auto space-y-5 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sale Completed!</h2>
            <p className="text-slate-500 text-sm mt-1">
              Inventory batches have been decremented via FEFO logic.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs sm:text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt Number:</span>
              <span className="font-mono font-bold text-slate-800">{nextReceiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Items Sold:</span>
              <span className="font-semibold text-slate-900">
                {cart.reduce((sum, c) => sum + c.quantity, 0)} units ({cart.length} lines)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Received:</span>
              <span className="font-bold text-emerald-700">{formatINR(grandTotal)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/print/receipt/${createdSaleId}`}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print Cash Receipt</span>
            </Link>
            <button
              onClick={() => {
                setCreatedSaleId(null);
                setCart([]);
              }}
              className="w-full sm:w-auto px-6 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold"
            >
              Start Next Sale
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Product Search & Cart Lines (2 Cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Quick Autocomplete Search */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                Quick Medicine Lookup (Code, Name, or Rack)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Type medicine name (e.g. Dolo 650, Augmentin, A-01)..."
                  value={selectedMedSearch}
                  onChange={(e) => setSelectedMedSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Autocomplete Menu */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {searchResults.map((med) => {
                    const stock = nonExpiredStockMap.get(med.id) || 0;
                    return (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => addMedicineToCart(med)}
                        className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between text-xs sm:text-sm transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{med.tradeName}</span>
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 rounded">
                              {med.code}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 rounded">
                              Rack {med.rackNo}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
                            {med.genericName}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-3">
                          <div className="font-bold text-slate-900">{formatINR(med.sellingPrice)}</div>
                          <div className="text-[11px]">
                            {stock === 0 ? (
                              <span className="text-rose-600 font-semibold">Out of Stock</span>
                            ) : (
                              <span className="text-emerald-700 font-medium">{stock} units left</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Prescription Cart Lines ({cart.length})
                </h2>
                <span className="text-xs text-slate-500 font-mono">FEFO Batch Deduction</span>
              </div>

              {cart.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs sm:text-sm space-y-2">
                  <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Cart is currently empty.</p>
                  <p className="text-slate-400 text-xs">Search and select medicines above to begin sale.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {allocationPreview.map((item, idx) => {
                    const med = item.medicine;
                    if (!med) return null;
                    const stock = nonExpiredStockMap.get(med.id) || 0;

                    return (
                      <div key={item.line.id} className="p-4 space-y-2 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {med.code}
                              </span>
                              <h4 className="font-bold text-slate-900 text-sm">{med.tradeName}</h4>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">
                                Rack {med.rackNo}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 truncate max-w-sm">
                              {med.genericName}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Qty controller */}
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                              <button
                                type="button"
                                onClick={() => updateQuantity(idx, item.line.quantity - 1)}
                                className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-sm"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={stock}
                                value={item.line.quantity}
                                onChange={(e) =>
                                  updateQuantity(idx, parseInt(e.target.value || '1', 10))
                                }
                                className="w-14 text-center text-xs font-bold text-slate-900 focus:outline-none py-1 border-x border-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(idx, item.line.quantity + 1)}
                                className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-sm"
                              >
                                +
                              </button>
                            </div>

                            {/* Line Total */}
                            <div className="text-right w-24">
                              <div className="text-sm font-bold text-slate-900">
                                {formatINR(item.totalLinePrice)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                @ {formatINR(med.sellingPrice)}/ea
                              </div>
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* FEFO Batch Allocation Breakdown Chips */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-emerald-600" />
                            <span>Allocated Batches:</span>
                          </span>

                          {item.batchesAllocated.map((b, bIdx) => (
                            <span
                              key={bIdx}
                              className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono shadow-2xs"
                            >
                              <strong className="text-emerald-800">{b.batchNo}</strong>
                              <span className="text-slate-500">({b.qty} units)</span>
                            </span>
                          ))}

                          {item.isOverselling && (
                            <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Exceeds non-expired stock ({stock} available)!</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Checkout & Billing Summary (1 Col) */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  Billing Summary
                </span>
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {nextReceiptNumber}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Number of Lines:</span>
                  <span className="font-semibold text-slate-800">{cart.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Unit Quantity:</span>
                  <span className="font-semibold text-slate-800">
                    {cart.reduce((sum, c) => sum + c.quantity, 0)} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (Included):</span>
                  <span className="text-slate-800">GST 0% / Exempt MRP</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-700">Total Payable:</span>
                  <span className="text-2xl font-extrabold text-emerald-800">
                    {formatINR(grandTotal)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 italic leading-snug">
                  {numberToWordsIndian(grandTotal)}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Complete Sale & Issue Receipt</span>
              </button>

              <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-800 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Strict FEFO Enforcement</span>
                </div>
                <p className="text-emerald-700">
                  Batches are consumed from earliest expiry date to preserve stock freshness. Expired batches are never sold.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading sales POS...</div>}>
      <SalesContent />
    </Suspense>
  );
}
