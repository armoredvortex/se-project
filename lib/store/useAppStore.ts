'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Medicine, Vendor, Supply, Sale, Settings, StoreState } from '../types';
import { generateSeedData } from '../seed';
import { processSale, SaleInputItem } from '../services/sales';
import { processSupply, SupplyInputItem } from '../services/supply';
import { markBatchesWrittenOff } from '../services/expiry';
import { formatMedicineCode } from '../services/codegen';

export interface AppStoreActions {
  // Medicines
  addMedicine: (med: Omit<Medicine, 'id' | 'code'> & { code?: string }) => Medicine;
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;

  // Vendors
  addVendor: (vendor: Omit<Vendor, 'id'>) => Vendor;
  updateVendor: (id: string, updates: Partial<Vendor>) => void;

  // Inventory / Stock
  writeOffBatches: (batchIds: string[]) => void;

  // Transactions
  recordSale: (items: SaleInputItem[], paymentMethod?: import('../types').PaymentMethod, customDate?: string) => Sale;
  receiveSupply: (vendorId: string, items: SupplyInputItem[], customDate?: string) => Supply;

  // Settings & App State
  updateSettings: (updates: Partial<Settings>) => void;
  resetData: () => void;
  setHasHydrated: (status: boolean) => void;
}

export type AppStore = StoreState & AppStoreActions & { hasHydrated: boolean };

const initialSeed = generateSeedData();

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialSeed,
      hasHydrated: false,

      setHasHydrated: (status: boolean) => set({ hasHydrated: status }),

      resetData: () => {
        const freshSeed = generateSeedData(new Date());
        set({
          ...freshSeed,
          hasHydrated: true,
        });
      },

      addMedicine: (medInput) => {
        const state = get();
        const nextNo = state.counters.nextMedicineNo;
        const code = medInput.code || formatMedicineCode(nextNo);
        const newMedicine: Medicine = {
          ...medInput,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `med-${Date.now()}`,
          code,
        };

        set({
          medicines: [...state.medicines, newMedicine],
          counters: {
            ...state.counters,
            nextMedicineNo: nextNo + 1,
          },
        });

        return newMedicine;
      },

      updateMedicine: (id, updates) => {
        const state = get();
        set({
          medicines: state.medicines.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        });
      },

      addVendor: (vendorInput) => {
        const state = get();
        const newVendor: Vendor = {
          ...vendorInput,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ven-${Date.now()}`,
        };

        set({
          vendors: [...state.vendors, newVendor],
        });

        return newVendor;
      },

      updateVendor: (id, updates) => {
        const state = get();
        set({
          vendors: state.vendors.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        });
      },

      writeOffBatches: (batchIds) => {
        const state = get();
        const nextState = markBatchesWrittenOff(state, batchIds);
        set({ batches: nextState.batches });
      },

      recordSale: (items, paymentMethod = 'cash', customDate) => {
        const state = get();
        const { nextState, sale } = processSale(state, items, paymentMethod, customDate);
        set({
          batches: nextState.batches,
          sales: nextState.sales,
          counters: nextState.counters,
        });
        return sale;
      },

      receiveSupply: (vendorId, items, customDate) => {
        const state = get();
        const { nextState, supply } = processSupply(state, vendorId, items, customDate);
        set({
          batches: nextState.batches,
          supplies: nextState.supplies,
          vendors: nextState.vendors,
          counters: nextState.counters,
        });
        return supply;
      },

      updateSettings: (updates) => {
        const state = get();
        set({
          settings: {
            ...state.settings,
            ...updates,
          },
        });
      },
    }),
    {
      name: 'msa-store-v1',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
