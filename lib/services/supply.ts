import { StockBatch, StoreState, Supply, SupplyItem } from '../types';
import { formatChequeNo } from './codegen';

export interface SupplyInputItem {
  medicineId: string;
  batchNo: string;
  expiryDate: string; // "YYYY-MM-DD"
  quantity: number;
  unitCost: number;
}

/**
 * Pure function to process receiving a supply consignment from a vendor.
 * Increments existing batch quantity if matching batchNo, expiryDate, medicineId, and vendorId exists,
 * or creates a new StockBatch.
 * Records the supply with sequential cheque number and returns updated store state.
 */
export function processSupply(
  state: StoreState,
  vendorId: string,
  inputItems: SupplyInputItem[],
  customDate?: string
): { nextState: StoreState; supply: Supply } {
  const vendor = state.vendors.find((v) => v.id === vendorId);
  if (!vendor) {
    throw new Error(`Vendor not found: ${vendorId}`);
  }

  if (!inputItems || inputItems.length === 0) {
    throw new Error('Supply must contain at least one line item');
  }

  // Validate each item
  for (const item of inputItems) {
    if (!item.medicineId) {
      throw new Error('Medicine is required for all line items');
    }
    if (!item.batchNo || item.batchNo.trim() === '') {
      throw new Error(`Batch number is required for medicine ${item.medicineId}`);
    }
    if (!item.expiryDate || item.expiryDate.trim() === '') {
      throw new Error(`Expiry date is required for batch ${item.batchNo}`);
    }
    if (item.quantity <= 0) {
      throw new Error(`Quantity must be greater than zero for batch ${item.batchNo}`);
    }
    if (item.unitCost < 0) {
      throw new Error(`Unit cost cannot be negative for batch ${item.batchNo}`);
    }
  }

  const updatedBatches = [...state.batches];
  const supplyItems: SupplyItem[] = [];

  for (const item of inputItems) {
    const trimmedBatchNo = item.batchNo.trim().toUpperCase();
    const cleanExpiry = item.expiryDate.trim();

    // Check if matching batch already exists in inventory
    const existingBatchIndex = updatedBatches.findIndex(
      (b) =>
        b.medicineId === item.medicineId &&
        b.batchNo.toUpperCase() === trimmedBatchNo &&
        b.vendorId === vendorId
    );

    if (existingBatchIndex >= 0) {
      const existing = updatedBatches[existingBatchIndex];
      updatedBatches[existingBatchIndex] = {
        ...existing,
        quantity: existing.quantity + item.quantity,
        expiryDate: cleanExpiry || existing.expiryDate,
      };
    } else {
      const newBatch: StockBatch = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        medicineId: item.medicineId,
        batchNo: trimmedBatchNo,
        expiryDate: cleanExpiry,
        quantity: item.quantity,
        vendorId,
      };
      updatedBatches.push(newBatch);
    }

    supplyItems.push({
      medicineId: item.medicineId,
      batchNo: trimmedBatchNo,
      expiryDate: cleanExpiry,
      quantity: item.quantity,
      unitCost: item.unitCost,
    });
  }

  const totalAmount = supplyItems.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  const chequeNo = formatChequeNo(state.counters.nextChequeNo);
  const supplyDate = customDate || new Date().toISOString();

  const supply: Supply = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `supply-${Date.now()}`,
    vendorId,
    date: supplyDate,
    totalAmount,
    chequeNo,
    items: supplyItems,
  };

  // Ensure vendor deals with all these medicines
  const updatedVendors = state.vendors.map((v) => {
    if (v.id === vendorId) {
      const currentMedIds = new Set(v.medicineIds);
      supplyItems.forEach((si) => currentMedIds.add(si.medicineId));
      return {
        ...v,
        medicineIds: Array.from(currentMedIds),
      };
    }
    return v;
  });

  const nextState: StoreState = {
    ...state,
    vendors: updatedVendors,
    batches: updatedBatches,
    supplies: [supply, ...state.supplies],
    counters: {
      ...state.counters,
      nextChequeNo: state.counters.nextChequeNo + 1,
    },
  };

  return { nextState, supply };
}
