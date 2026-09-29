import { ReorderItem, Sale, StockBatch, StoreState, Vendor, VendorReorderGroup } from '../types';
import { isBatchExpired } from '../formatters';
import { parseISO, startOfDay, subDays } from 'date-fns';

/**
 * Computes the weekly average sales for a medicine over the last N days.
 * Formula: units sold in last N days / (N / 7).
 */
export function calculateWeeklyAverageSales(
  sales: Sale[],
  medicineId: string,
  windowDays: number = 28,
  referenceDate: Date = new Date()
): number {
  if (windowDays <= 0) return 0;

  const cutoff = subDays(startOfDay(referenceDate), windowDays);

  let totalUnitsSold = 0;

  for (const sale of sales) {
    const saleDate = typeof sale.createdAt === 'string' ? parseISO(sale.createdAt) : sale.createdAt;
    if (saleDate >= cutoff) {
      for (const item of sale.items) {
        if (item.medicineId === medicineId) {
          totalUnitsSold += item.quantity;
        }
      }
    }
  }

  const weeksInWindow = windowDays / 7;
  return totalUnitsSold / weeksInWindow;
}

/**
 * Calculates current non-expired stock for a medicine.
 */
export function calculateNonExpiredStock(
  batches: StockBatch[],
  medicineId: string,
  referenceDate: Date = new Date()
): number {
  return batches
    .filter(
      (b) =>
        b.medicineId === medicineId &&
        b.quantity > 0 &&
        !isBatchExpired(b.expiryDate, referenceDate)
    )
    .reduce((sum, b) => sum + b.quantity, 0);
}

/**
 * Generates reorder suggestions for all medicines, grouped by vendor.
 * Threshold = weekly average sales.
 * If current stock < threshold, orderQty = ceil(weekly_avg * cover_multiplier - current_stock).
 */
export function calculateReorderReport(
  state: StoreState,
  windowDays: number = 28,
  coverMultiplier: number = 1.0,
  referenceDate: Date = new Date()
): { reorderItems: ReorderItem[]; vendorGroups: VendorReorderGroup[] } {
  const reorderItems: ReorderItem[] = [];

  for (const medicine of state.medicines) {
    const weeklyAvg = calculateWeeklyAverageSales(
      state.sales,
      medicine.id,
      windowDays,
      referenceDate
    );
    const currentStock = calculateNonExpiredStock(
      state.batches,
      medicine.id,
      referenceDate
    );
    const threshold = weeklyAvg;

    if (currentStock < threshold) {
      const targetUnits = weeklyAvg * coverMultiplier;
      const rawNeeded = targetUnits - currentStock;
      const orderQty = Math.max(1, Math.ceil(rawNeeded));

      reorderItems.push({
        medicine,
        currentStock,
        weeklyAvgSales: Number(weeklyAvg.toFixed(2)),
        threshold: Number(threshold.toFixed(2)),
        orderQty,
      });
    }
  }

  // Group by vendor
  const vendorMap = new Map<string, Vendor>(state.vendors.map((v) => [v.id, v]));
  const groupMap = new Map<string, ReorderItem[]>();

  // Fallback vendor for medicines without vendor link
  const defaultVendor: Vendor = {
    id: 'unassigned',
    name: 'Unassigned / Direct Purchase',
    address: 'Direct market supply',
    medicineIds: [],
  };

  for (const item of reorderItems) {
    // Find vendor that deals with this medicine
    let matchedVendor = state.vendors.find((v) => v.medicineIds.includes(item.medicine.id));

    // If not found in medicineIds, check recent batch vendorId
    if (!matchedVendor) {
      const batchWithVendor = state.batches.find((b) => b.medicineId === item.medicine.id && b.vendorId);
      if (batchWithVendor) {
        matchedVendor = vendorMap.get(batchWithVendor.vendorId);
      }
    }

    const vendorId = matchedVendor ? matchedVendor.id : defaultVendor.id;
    const existingList = groupMap.get(vendorId) || [];
    existingList.push(item);
    groupMap.set(vendorId, existingList);
  }

  const vendorGroups: VendorReorderGroup[] = [];

  for (const [vendorId, items] of Array.from(groupMap.entries())) {
    const vendor = vendorMap.get(vendorId) || defaultVendor;
    const totalEstimatedCost = items.reduce(
      (sum, item) => sum + item.orderQty * item.medicine.purchasePrice,
      0
    );

    vendorGroups.push({
      vendor,
      items,
      totalEstimatedCost,
    });
  }

  // Sort vendor groups by total cost descending
  vendorGroups.sort((a, b) => b.totalEstimatedCost - a.totalEstimatedCost);

  return { reorderItems, vendorGroups };
}
