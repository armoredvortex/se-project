import { ExpiredBatchDetail, Medicine, StockBatch, StoreState, Vendor, VendorExpiryGroup } from '../types';
import { isBatchExpired } from '../formatters';

/**
 * Returns all batches that are currently expired and have non-zero stock, enriched with medicine and vendor details.
 */
export function getExpiredBatchDetails(
  batches: StockBatch[],
  medicines: Medicine[],
  vendors: Vendor[],
  referenceDate: Date = new Date()
): ExpiredBatchDetail[] {
  const medicineMap = new Map(medicines.map((m) => [m.id, m]));
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));

  const expiredBatches = batches.filter(
    (b) => b.quantity > 0 && isBatchExpired(b.expiryDate, referenceDate)
  );

  return expiredBatches
    .map((batch) => {
      const medicine = medicineMap.get(batch.medicineId) || {
        id: batch.medicineId,
        code: 'MED-UNKNOWN',
        tradeName: 'Unknown Medicine',
        genericName: 'Unknown',
        sellingPrice: 0,
        purchasePrice: 0,
        rackNo: 'N/A',
      };
      const vendor = vendorMap.get(batch.vendorId);
      const estimatedLoss = batch.quantity * medicine.purchasePrice;

      return {
        batch,
        medicine,
        vendor,
        estimatedLoss,
      };
    })
    .sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
}

/**
 * Groups expired batches by vendor for replacement/return requests.
 */
export function groupExpiredBatchesByVendor(
  expiredDetails: ExpiredBatchDetail[],
  allVendors: Vendor[] = []
): VendorExpiryGroup[] {
  const vendorMap = new Map(allVendors.map((v) => [v.id, v]));
  const groupMap = new Map<string, ExpiredBatchDetail[]>();

  const defaultVendor: Vendor = {
    id: 'unassigned',
    name: 'Unknown / Direct Supplier',
    address: 'Direct market procurement',
    medicineIds: [],
  };

  for (const item of expiredDetails) {
    const vId = item.batch.vendorId || 'unassigned';
    const list = groupMap.get(vId) || [];
    list.push(item);
    groupMap.set(vId, list);
  }

  const groups: VendorExpiryGroup[] = [];

  for (const [vendorId, items] of Array.from(groupMap.entries())) {
    const vendor = vendorMap.get(vendorId) || items[0]?.vendor || defaultVendor;
    const totalReturnValue = items.reduce((sum, i) => sum + i.estimatedLoss, 0);

    groups.push({
      vendor,
      items,
      totalReturnValue,
    });
  }

  // Sort groups by total return value descending
  groups.sort((a, b) => b.totalReturnValue - a.totalReturnValue);

  return groups;
}

/**
 * Pure function to zero out quantities of specified expired batches (marking them returned / written off).
 */
export function markBatchesWrittenOff(
  state: StoreState,
  batchIdsToZero: string[]
): StoreState {
  const targetIds = new Set(batchIdsToZero);

  const updatedBatches = state.batches.map((batch) => {
    if (targetIds.has(batch.id)) {
      return {
        ...batch,
        quantity: 0,
      };
    }
    return batch;
  });

  return {
    ...state,
    batches: updatedBatches,
  };
}
