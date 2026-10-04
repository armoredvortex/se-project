import { describe, it, expect } from 'vitest';
import { allocateMedicineStock, processSale } from '../lib/services/sales';
import { Medicine, StockBatch, StoreState } from '../lib/types';

describe('sales service - FEFO allocation', () => {
  const medicine: Medicine = {
    id: 'med-1',
    code: 'MED-0001',
    tradeName: 'Paracetamol 650',
    genericName: 'Paracetamol',
    sellingPrice: 30,
    purchasePrice: 20,
    rackNo: 'A-1',
  };

  const referenceDate = new Date('2026-09-01T00:00:00Z');

  it('allocates stock from a single non-expired batch', () => {
    const batches: StockBatch[] = [
      {
        id: 'b-1',
        medicineId: 'med-1',
        batchNo: 'B001',
        expiryDate: '2026-12-01',
        quantity: 50,
        vendorId: 'v-1',
      },
    ];

    const result = allocateMedicineStock(batches, medicine, 20, referenceDate);
    expect(result.allocatedItems).toHaveLength(1);
    expect(result.allocatedItems[0].batchNo).toBe('B001');
    expect(result.allocatedItems[0].quantity).toBe(20);
    expect(result.allocatedItems[0].unitPrice).toBe(30);
    expect(result.allocatedItems[0].unitCost).toBe(20);

    const updatedBatch = result.updatedBatches.find((b) => b.id === 'b-1');
    expect(updatedBatch?.quantity).toBe(30);
  });

  it('spans across multiple batches using earliest-expiring first (FEFO)', () => {
    const batches: StockBatch[] = [
      {
        id: 'b-later',
        medicineId: 'med-1',
        batchNo: 'B-LATER',
        expiryDate: '2027-06-01',
        quantity: 30,
        vendorId: 'v-1',
      },
      {
        id: 'b-earlier',
        medicineId: 'med-1',
        batchNo: 'B-EARLIER',
        expiryDate: '2026-11-01',
        quantity: 15,
        vendorId: 'v-1',
      },
    ];

    const result = allocateMedicineStock(batches, medicine, 25, referenceDate);
    expect(result.allocatedItems).toHaveLength(2);
    // Earliest batch should be consumed first
    expect(result.allocatedItems[0].batchNo).toBe('B-EARLIER');
    expect(result.allocatedItems[0].quantity).toBe(15);
    // Remaining 10 taken from the later batch
    expect(result.allocatedItems[1].batchNo).toBe('B-LATER');
    expect(result.allocatedItems[1].quantity).toBe(10);

    expect(result.updatedBatches.find((b) => b.id === 'b-earlier')?.quantity).toBe(0);
    expect(result.updatedBatches.find((b) => b.id === 'b-later')?.quantity).toBe(20);
  });

  it('excludes expired batches even if they have stock', () => {
    const batches: StockBatch[] = [
      {
        id: 'b-expired',
        medicineId: 'med-1',
        batchNo: 'B-EXP',
        expiryDate: '2026-08-01', // expired before referenceDate (2026-09-01)
        quantity: 100,
        vendorId: 'v-1',
      },
      {
        id: 'b-valid',
        medicineId: 'med-1',
        batchNo: 'B-VALID',
        expiryDate: '2026-10-01',
        quantity: 10,
        vendorId: 'v-1',
      },
    ];

    // Requesting 15 should fail because only 10 non-expired are available
    expect(() => {
      allocateMedicineStock(batches, medicine, 15, referenceDate);
    }).toThrow(/Insufficient non-expired stock/);

    // Requesting 10 should succeed and take only from valid batch
    const result = allocateMedicineStock(batches, medicine, 10, referenceDate);
    expect(result.allocatedItems).toHaveLength(1);
    expect(result.allocatedItems[0].batchNo).toBe('B-VALID');
    expect(result.updatedBatches.find((b) => b.id === 'b-expired')?.quantity).toBe(100);
    expect(result.updatedBatches.find((b) => b.id === 'b-valid')?.quantity).toBe(0);
  });

  it('executes atomic sale via processSale', () => {
    const state: StoreState = {
      medicines: [medicine],
      vendors: [],
      batches: [
        {
          id: 'b-1',
          medicineId: 'med-1',
          batchNo: 'B001',
          expiryDate: '2026-12-01',
          quantity: 20,
          vendorId: 'v-1',
        },
      ],
      supplies: [],
      sales: [],
      settings: {
        salesWindowDays: 28,
        coverMultiplier: 1.0,
        shopName: 'Test Meds',
        shopAddress: 'Test Address',
        shopPhone: '1234567890',
      },
      counters: {
        nextMedicineNo: 2,
        nextChequeNo: 1,
        nextReceiptNo: 1,
      },
    };

    const { nextState, sale } = processSale(
      state,
      [{ medicineId: 'med-1', quantity: 5 }],
      'cash',
      '2026-09-01T12:00:00Z',
      referenceDate
    );

    expect(sale.receiptNo).toBe('REC-000001');
    expect(sale.totalAmount).toBe(150); // 5 * 30
    expect(sale.items[0].unitPrice).toBe(30);
    expect(sale.items[0].unitCost).toBe(20);
    expect(nextState.batches[0].quantity).toBe(15);
    expect(nextState.counters.nextReceiptNo).toBe(2);
    expect(nextState.sales).toHaveLength(1);
  });
});
