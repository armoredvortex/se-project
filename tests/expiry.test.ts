import { describe, it, expect } from 'vitest';
import { getExpiredBatchDetails, groupExpiredBatchesByVendor, markBatchesWrittenOff } from '../lib/services/expiry';
import { Medicine, StockBatch, StoreState, Vendor } from '../lib/types';

describe('expiry service', () => {
  const refDate = new Date('2026-09-01T00:00:00Z');

  const med1: Medicine = {
    id: 'med-1',
    code: 'MED-0001',
    tradeName: 'Pantocid 40',
    genericName: 'Pantoprazole',
    sellingPrice: 150,
    purchasePrice: 100,
    rackNo: 'P-1',
  };

  const med2: Medicine = {
    id: 'med-2',
    code: 'MED-0002',
    tradeName: 'Combiflam',
    genericName: 'Ibuprofen + Paracetamol',
    sellingPrice: 40,
    purchasePrice: 30,
    rackNo: 'C-2',
  };

  const vendorA: Vendor = {
    id: 'v-a',
    name: 'Mahavir Pharma Agencies',
    address: 'Ahmedabad, GJ',
    medicineIds: ['med-1'],
  };

  const vendorB: Vendor = {
    id: 'v-b',
    name: 'Sun City Pharmaceuticals',
    address: 'Surat, GJ',
    medicineIds: ['med-2'],
  };

  const batches: StockBatch[] = [
    {
      id: 'b-exp-1',
      medicineId: 'med-1',
      batchNo: 'PAN-EX1',
      expiryDate: '2026-08-15', // expired
      quantity: 20,
      vendorId: 'v-a',
    },
    {
      id: 'b-exp-2',
      medicineId: 'med-2',
      batchNo: 'COM-EX2',
      expiryDate: '2026-07-01', // expired
      quantity: 50,
      vendorId: 'v-b',
    },
    {
      id: 'b-valid',
      medicineId: 'med-1',
      batchNo: 'PAN-OK',
      expiryDate: '2027-01-01', // valid
      quantity: 30,
      vendorId: 'v-a',
    },
    {
      id: 'b-zero-exp',
      medicineId: 'med-2',
      batchNo: 'COM-ZERO',
      expiryDate: '2026-06-01', // expired but quantity 0
      quantity: 0,
      vendorId: 'v-b',
    },
  ];

  it('identifies expired batches with non-zero stock', () => {
    const expired = getExpiredBatchDetails(batches, [med1, med2], [vendorA, vendorB], refDate);
    expect(expired).toHaveLength(2);
    expect(expired.map((e) => e.batch.batchNo)).toEqual(expect.arrayContaining(['PAN-EX1', 'COM-EX2']));

    const panEx = expired.find((e) => e.batch.batchNo === 'PAN-EX1');
    expect(panEx?.estimatedLoss).toBe(20 * 100); // 2000
  });

  it('groups expired batches by vendor', () => {
    const expired = getExpiredBatchDetails(batches, [med1, med2], [vendorA, vendorB], refDate);
    const groups = groupExpiredBatchesByVendor(expired, [vendorA, vendorB]);

    expect(groups).toHaveLength(2);
    const groupA = groups.find((g) => g.vendor.id === 'v-a');
    const groupB = groups.find((g) => g.vendor.id === 'v-b');

    expect(groupA?.totalReturnValue).toBe(2000); // 20 * 100
    expect(groupB?.totalReturnValue).toBe(1500); // 50 * 30
  });

  it('marks batches written off by zeroing quantity', () => {
    const state: StoreState = {
      medicines: [med1, med2],
      vendors: [vendorA, vendorB],
      batches,
      supplies: [],
      sales: [],
      settings: {
        salesWindowDays: 28,
        coverMultiplier: 1.0,
        shopName: 'Test',
        shopAddress: 'Test',
        shopPhone: '123',
      },
      counters: { nextMedicineNo: 3, nextChequeNo: 1, nextReceiptNo: 1 },
      bannerDismissed: false,
    };

    const nextState = markBatchesWrittenOff(state, ['b-exp-1', 'b-exp-2']);
    expect(nextState.batches.find((b) => b.id === 'b-exp-1')?.quantity).toBe(0);
    expect(nextState.batches.find((b) => b.id === 'b-exp-2')?.quantity).toBe(0);
    // Non-targeted batch remains unchanged
    expect(nextState.batches.find((b) => b.id === 'b-valid')?.quantity).toBe(30);
  });
});
