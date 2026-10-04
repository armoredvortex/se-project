export interface Medicine {
  id: string;
  code: string; // e.g. "MED-0001"
  tradeName: string;
  genericName: string;
  sellingPrice: number;
  purchasePrice: number;
  rackNo: string;
}

export interface Vendor {
  id: string;
  name: string;
  address: string;
  phone?: string;
  medicineIds: string[]; // vendor-to-medicine link
}

export interface StockBatch {
  id: string;
  medicineId: string;
  batchNo: string;
  expiryDate: string; // "YYYY-MM-DD"
  quantity: number;
  vendorId: string;
}

export interface SupplyItem {
  medicineId: string;
  batchNo: string;
  expiryDate: string; // "YYYY-MM-DD"
  quantity: number;
  unitCost: number;
}

export interface Supply {
  id: string;
  vendorId: string;
  date: string; // ISO date-time or YYYY-MM-DD
  totalAmount: number;
  chequeNo: string;
  items: SupplyItem[];
}

export interface SaleItem {
  medicineId: string;
  batchNo: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export type PaymentMethod = 'cash' | 'upi';

export interface Sale {
  id: string;
  receiptNo: string;
  createdAt: string; // ISO string
  totalAmount: number;
  paymentMethod: PaymentMethod;
  items: SaleItem[];
}

export interface Settings {
  salesWindowDays: number; // default 28
  coverMultiplier: number; // default 1.0
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopGst?: string;
  upiVpa?: string; // e.g. "shop@upi" — used to generate QR
}

export interface Counters {
  nextMedicineNo: number;
  nextChequeNo: number;
  nextReceiptNo: number;
}

export interface StoreState {
  medicines: Medicine[];
  vendors: Vendor[];
  batches: StockBatch[];
  supplies: Supply[];
  sales: Sale[];
  settings: Settings;
  counters: Counters;
}

export interface ReorderItem {
  medicine: Medicine;
  currentStock: number;
  weeklyAvgSales: number;
  threshold: number;
  orderQty: number;
}

export interface VendorReorderGroup {
  vendor: Vendor;
  items: ReorderItem[];
  totalEstimatedCost: number;
}

export interface ExpiredBatchDetail {
  batch: StockBatch;
  medicine: Medicine;
  vendor?: Vendor;
  estimatedLoss: number;
}

export interface VendorExpiryGroup {
  vendor: Vendor;
  items: ExpiredBatchDetail[];
  totalReturnValue: number;
}

export interface FinancialSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
  salesCount: number;
  dailyTrend: Array<{
    date: string;
    revenue: number;
    cogs: number;
    profit: number;
  }>;
  vendorPayments: Array<{
    vendorId: string;
    vendorName: string;
    totalAmount: number;
    suppliesCount: number;
    lastPaymentDate: string;
  }>;
}
