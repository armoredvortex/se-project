import { describe, it, expect } from 'vitest';
import { calculateReorderReport, calculateWeeklyAverageSales } from '../lib/services/reorder';
import { Medicine, Sale, StoreState, Vendor } from '../lib/types';
import { subDays } from 'date-fns';

describe('reorder service', () => {
  const refDate = new Date('2026-09-01T12:00:00Z');

  const medicine: Medicine = {
    id: 'med-reorder',
    code: 'MED-0001',
    tradeName: 'Azithral 500',
    genericName: 'Azithromycin',
    sellingPrice: 120,
    purchasePrice: 90,
    rackNo: 'C-1',
  };

  const vendor: Vendor = {
    id: 'v-1',
    name: 'Apollo Med Supply',
    address: 'Pune, MH',
    medicineIds: ['med-reorder'],
  };

  it('calculates weekly average sales correctly over a 28-day window', () => {
    // 28 days = 4 weeks
    // Create sales: 40 units sold 5 days ago, 20 units sold 15 days ago, 100 units sold 50 days ago (outside window)
    const sales: Sale[] = [
      {
        id: 's-1',
        receiptNo: 'REC-001',
        createdAt: subDays(refDate, 5).toISOString(),
        totalAmount: 4800,
        items: [{ medicineId: 'med-reorder', batchNo: 'B1', quantity: 40, unitPrice: 120, unitCost: 90 }],
      },
      {
        id: 's-2',
        receiptNo: 'REC-002',
        createdAt: subDays(refDate, 15).toISOString(),
        totalAmount: 2400,
        items: [{ medicineId: 'med-reorder', batchNo: 'B1', quantity: 20, unitPrice: 120, unitCost: 90 }],
      },
      {
        id: 's-old',
        receiptNo: 'REC-003',
        createdAt: subDays(refDate, 50).toISOString(), // outside 28-day window
        totalAmount: 12000,
        items: [{ medicineId: 'med-reorder', batchNo: 'B1', quantity: 100, unitPrice: 120, unitCost: 90 }],
      },
    ];

    // Total in last 28 days = 40 + 20 = 60 units.
    // 28 days / 7 = 4 weeks.
    // Weekly average = 60 / 4 = 15 units/week.
    const weeklyAvg = calculateWeeklyAverageSales(sales, 'med-reorder', 28, refDate);
    expect(weeklyAvg).toBe(15);
  });

  it('generates reorder suggestions and calculates ceil(weekly_avg * cover_multiplier - stock)', () => {
    // Weekly average = 15. Stock = 5.
    // Cover multiplier = 1.5. Target = 15 * 1.5 = 22.5.
    // Order qty = ceil(22.5 - 5) = ceil(17.5) = 18.
    const state: StoreState = {
      medicines: [medicine],
      vendors: [vendor],
      batches: [
        {
          id: 'b-valid',
          medicineId: 'med-reorder',
          batchNo: 'B-VAL',
          expiryDate: '2027-01-01',
          quantity: 5,
          vendorId: 'v-1',
        },
        {
          id: 'b-exp',
          medicineId: 'med-reorder',
          batchNo: 'B-EXP',
          expiryDate: '2026-08-01', // expired! Should not count as current stock
          quantity: 50,
          vendorId: 'v-1',
        },
      ],
      supplies: [],
      sales: [
        {
          id: 's-1',
          receiptNo: 'REC-001',
          createdAt: subDays(refDate, 7).toISOString(),
          totalAmount: 7200,
          items: [{ medicineId: 'med-reorder', batchNo: 'B-VAL', quantity: 60, unitPrice: 120, unitCost: 90 }],
        },
      ],
      settings: {
        salesWindowDays: 28,
        coverMultiplier: 1.5,
        shopName: 'Test Shop',
        shopAddress: 'Address',
        shopPhone: '123',
      },
      counters: { nextMedicineNo: 2, nextChequeNo: 1, nextReceiptNo: 2 },
      bannerDismissed: false,
    };

    // 60 units sold in 4 weeks -> weeklyAvg = 15.
    // current non-expired stock = 5 (expired batch ignored!).
    // 5 < 15, so triggers reorder.
    // target = 15 * 1.5 = 22.5. Order = ceil(22.5 - 5) = 18.
    const { reorderItems, vendorGroups } = calculateReorderReport(state, 28, 1.5, refDate);

    expect(reorderItems).toHaveLength(1);
    expect(reorderItems[0].currentStock).toBe(5);
    expect(reorderItems[0].weeklyAvgSales).toBe(15);
    expect(reorderItems[0].orderQty).toBe(18);

    expect(vendorGroups).toHaveLength(1);
    expect(vendorGroups[0].vendor.name).toBe('Apollo Med Supply');
    expect(vendorGroups[0].totalEstimatedCost).toBe(18 * 90); // 1620
  });
});
