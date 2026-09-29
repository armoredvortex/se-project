import { Medicine, Sale, SaleItem, StockBatch, StoreState } from '../types';
import { isBatchExpired } from '../formatters';
import { formatReceiptNo } from './codegen';

export interface SaleInputItem {
  medicineId: string;
  quantity: number;
}

export interface AllocateBatchResult {
  allocatedItems: SaleItem[];
  updatedBatches: StockBatch[];
}

/**
 * Allocate stock for a single medicine using First Expired, First Out (FEFO) strategy.
 * Spans across multiple batches if needed.
 * Strictly ignores expired batches.
 */
export function allocateMedicineStock(
  batches: StockBatch[],
  medicine: Medicine,
  requestedQty: number,
  referenceDate: Date = new Date()
): AllocateBatchResult {
  if (requestedQty <= 0) {
    throw new Error(`Requested quantity must be greater than zero for ${medicine.tradeName}`);
  }

  // Filter non-expired batches with available stock for this medicine
  const eligibleBatches = batches
    .filter(
      (b) =>
        b.medicineId === medicine.id &&
        b.quantity > 0 &&
        !isBatchExpired(b.expiryDate, referenceDate)
    )
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  const totalAvailable = eligibleBatches.reduce((sum, b) => sum + b.quantity, 0);

  if (totalAvailable < requestedQty) {
    throw new Error(
      `Insufficient non-expired stock for "${medicine.tradeName}". Available: ${totalAvailable}, Requested: ${requestedQty}`
    );
  }

  let remainingToAllocate = requestedQty;
  const allocatedItems: SaleItem[] = [];
  const batchQuantityDeltas = new Map<string, number>();

  for (const batch of eligibleBatches) {
    if (remainingToAllocate <= 0) break;

    const take = Math.min(batch.quantity, remainingToAllocate);
    batchQuantityDeltas.set(batch.id, take);

    allocatedItems.push({
      medicineId: medicine.id,
      batchNo: batch.batchNo,
      quantity: take,
      unitPrice: medicine.sellingPrice,
      unitCost: medicine.purchasePrice,
    });

    remainingToAllocate -= take;
  }

  // Generate updated batches array
  const updatedBatches = batches.map((b) => {
    const delta = batchQuantityDeltas.get(b.id);
    if (delta !== undefined) {
      return {
        ...b,
        quantity: b.quantity - delta,
      };
    }
    return b;
  });

  return { allocatedItems, updatedBatches };
}

/**
 * Pure function to execute an atomic sale against the current store state.
 * Validates stock across all items, snapshots prices, decrements stock, and returns updated state + new sale.
 */
export function processSale(
  state: StoreState,
  inputItems: SaleInputItem[],
  customDate?: string,
  referenceDate: Date = new Date()
): { nextState: StoreState; sale: Sale } {
  if (!inputItems || inputItems.length === 0) {
    throw new Error('Sale must contain at least one item');
  }

  const medicineMap = new Map(state.medicines.map((m) => [m.id, m]));
  let currentBatches = [...state.batches];
  const allSaleItems: SaleItem[] = [];

  for (const item of inputItems) {
    const medicine = medicineMap.get(item.medicineId);
    if (!medicine) {
      throw new Error(`Medicine not found: ${item.medicineId}`);
    }

    const { allocatedItems, updatedBatches } = allocateMedicineStock(
      currentBatches,
      medicine,
      item.quantity,
      referenceDate
    );

    allSaleItems.push(...allocatedItems);
    currentBatches = updatedBatches;
  }

  const totalAmount = allSaleItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const receiptNo = formatReceiptNo(state.counters.nextReceiptNo);
  const createdAt = customDate || new Date().toISOString();

  const sale: Sale = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sale-${Date.now()}`,
    receiptNo,
    createdAt,
    totalAmount,
    items: allSaleItems,
  };

  const nextState: StoreState = {
    ...state,
    batches: currentBatches,
    sales: [sale, ...state.sales],
    counters: {
      ...state.counters,
      nextReceiptNo: state.counters.nextReceiptNo + 1,
    },
  };

  return { nextState, sale };
}
