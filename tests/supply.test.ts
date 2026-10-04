import { describe, it, expect } from 'vitest';
import { processSupply } from '../lib/services/supply';
import { StoreState, Vendor } from '../lib/types';

describe('supply service', () => {
  const vendor: Vendor = {
    id: 'v-1',
    name: 'Apex Healthcare Distributors',
    address: 'Mumbai, MH',
    medicineIds: ['med-1'],
  };

  const initialState: StoreState = {
    medicines: [
      {
        id: 'med-1',
        code: 'MED-0001',
        tradeName: 'Augmentin 625',
        genericName: 'Amoxicillin + Clavulanic Acid',
        sellingPrice: 200,
        purchasePrice: 150,
        rackNo: 'B-2',
      },
      {
        id: 'med-2',
        code: 'MED-0002',
        tradeName: 'Dolo 650',
        genericName: 'Paracetamol',
        sellingPrice: 35,
        purchasePrice: 25,
        rackNo: 'A-1',
      },
    ],
    vendors: [vendor],
    batches: [
      {
        id: 'b-existing',
        medicineId: 'med-1',
        batchNo: 'AUG-101',
        expiryDate: '2027-01-01',
        quantity: 10,
        vendorId: 'v-1',
      },
    ],
    supplies: [],
    sales: [],
    settings: {
      salesWindowDays: 28,
      coverMultiplier: 1.0,
      shopName: 'Test Shop',
      shopAddress: 'Address',
      shopPhone: '123',
    },
    counters: {
      nextMedicineNo: 3,
      nextChequeNo: 1,
      nextReceiptNo: 1,
    },
  };

  it('increments existing batch quantity if batch number matches', () => {
    const { nextState, supply } = processSupply(initialState, 'v-1', [
      {
        medicineId: 'med-1',
        batchNo: 'AUG-101',
        expiryDate: '2027-01-01',
        quantity: 50,
        unitCost: 150,
      },
    ]);

    expect(supply.chequeNo).toBe('CHQ-000001');
    expect(supply.totalAmount).toBe(7500); // 50 * 150
    expect(nextState.batches).toHaveLength(1);
    expect(nextState.batches[0].quantity).toBe(60); // 10 + 50
    expect(nextState.counters.nextChequeNo).toBe(2);
  });

  it('creates new batch for new batch number and updates vendor medicineIds', () => {
    const { nextState, supply } = processSupply(initialState, 'v-1', [
      {
        medicineId: 'med-2',
        batchNo: 'DOLO-999',
        expiryDate: '2027-05-01',
        quantity: 100,
        unitCost: 25,
      },
    ]);

    expect(supply.totalAmount).toBe(2500);
    expect(nextState.batches).toHaveLength(2);
    const newBatch = nextState.batches.find((b) => b.batchNo === 'DOLO-999');
    expect(newBatch).toBeDefined();
    expect(newBatch?.quantity).toBe(100);

    const updatedVendor = nextState.vendors.find((v) => v.id === 'v-1');
    expect(updatedVendor?.medicineIds).toContain('med-2');
  });
});
