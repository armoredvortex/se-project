import { describe, it, expect } from 'vitest';
import { calculateFinancials } from '../lib/services/finance';
import { Sale, Supply, Vendor } from '../lib/types';

describe('finance service', () => {
  const vendor1: Vendor = {
    id: 'v-1',
    name: 'Apollo Med Supply',
    address: 'Pune',
    medicineIds: [],
  };

  const sales: Sale[] = [
    {
      id: 's-1',
      receiptNo: 'REC-001',
      createdAt: '2026-09-10T10:00:00Z',
      totalAmount: 1000,
      paymentMethod: 'cash',
      items: [
        { medicineId: 'm-1', batchNo: 'B1', quantity: 10, unitPrice: 100, unitCost: 70 }, // Rev: 1000, Cost: 700
      ],
    },
    {
      id: 's-2',
      receiptNo: 'REC-002',
      createdAt: '2026-09-15T14:30:00Z',
      totalAmount: 500,
      paymentMethod: 'cash',
      items: [
        { medicineId: 'm-2', batchNo: 'B2', quantity: 5, unitPrice: 100, unitCost: 60 }, // Rev: 500, Cost: 300
      ],
    },
    {
      id: 's-outside',
      receiptNo: 'REC-003',
      createdAt: '2026-08-01T14:30:00Z',
      totalAmount: 200,
      paymentMethod: 'cash',
      items: [
        { medicineId: 'm-1', batchNo: 'B1', quantity: 2, unitPrice: 100, unitCost: 70 },
      ],
    },
  ];

  const supplies: Supply[] = [
    {
      id: 'sup-1',
      vendorId: 'v-1',
      date: '2026-09-05T09:00:00Z',
      totalAmount: 15000,
      chequeNo: 'CHQ-001',
      items: [],
    },
    {
      id: 'sup-2',
      vendorId: 'v-1',
      date: '2026-09-12T09:00:00Z',
      totalAmount: 10000,
      chequeNo: 'CHQ-002',
      items: [],
    },
  ];

  it('calculates revenue, COGS, gross profit, and margin within date range', () => {
    const start = new Date('2026-09-01T00:00:00Z');
    const end = new Date('2026-09-30T23:59:59Z');

    const result = calculateFinancials(sales, supplies, [vendor1], start, end);

    // Sales s-1 & s-2 are within range.
    // Revenue: 1000 + 500 = 1500
    // COGS: 700 + 300 = 1000
    // Gross Profit: 500
    // Margin: 500 / 1500 * 100 = 33.3%
    expect(result.revenue).toBe(1500);
    expect(result.cogs).toBe(1000);
    expect(result.grossProfit).toBe(500);
    expect(result.marginPercent).toBe(33.3);
    expect(result.salesCount).toBe(2);

    expect(result.dailyTrend).toHaveLength(2);
    expect(result.dailyTrend[0].date).toBe('2026-09-10');
    expect(result.dailyTrend[0].profit).toBe(300);

    // Vendor payments
    expect(result.vendorPayments).toHaveLength(1);
    expect(result.vendorPayments[0].totalAmount).toBe(25000); // 15000 + 10000
    expect(result.vendorPayments[0].suppliesCount).toBe(2);
  });
});
