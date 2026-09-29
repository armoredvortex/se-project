import { format, subDays, addDays } from 'date-fns';
import { Medicine, Vendor, StockBatch, Supply, Sale, Settings, Counters, StoreState } from './types';
import { formatChequeNo, formatMedicineCode, formatReceiptNo } from './services/codegen';

// Seeded pseudo-random number generator (Mulberry32)
function createPRNG(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeedData(baseDate: Date = new Date()): StoreState {
  const prng = createPRNG(42);

  function randomInt(min: number, max: number): number {
    return Math.floor(prng() * (max - min + 1)) + min;
  }

  // 5 Realistic Indian Vendors
  const vendors: Vendor[] = [
    {
      id: 'ven-1',
      name: 'Apex Healthcare Distributors',
      address: 'Plot 42, MIDC Industrial Area, Andheri (E), Mumbai, MH - 400093',
      phone: '+91 98201 12345',
      medicineIds: [],
    },
    {
      id: 'ven-2',
      name: 'Mahavir Pharma Agencies',
      address: 'Shop 12-14, Medicine Market, Ashram Road, Ahmedabad, GJ - 380009',
      phone: '+91 98790 23456',
      medicineIds: [],
    },
    {
      id: 'ven-3',
      name: 'Apollo Med Supply Corp',
      address: '88, J.M. Road, Shivaji Nagar, Pune, MH - 411005',
      phone: '+91 98220 34567',
      medicineIds: [],
    },
    {
      id: 'ven-4',
      name: 'Sun City Pharmaceuticals',
      address: 'Ring Road Wholesale Center, Surat, GJ - 395002',
      phone: '+91 98980 45678',
      medicineIds: [],
    },
    {
      id: 'ven-5',
      name: 'Kothari Drug Agency',
      address: '312, Sadashiv Peth, Laxmi Road, Pune, MH - 411030',
      phone: '+91 98500 56789',
      medicineIds: [],
    },
  ];

  // 25 Realistic Indian Retail Medicines
  const rawMedicines = [
    { trade: 'Augmentin 625 Duo', generic: 'Amoxicillin + Clavulanic Acid (500mg+125mg)', sell: 204.50, buy: 158.00, rack: 'A-01' },
    { trade: 'Dolo 650 Tablet', generic: 'Paracetamol (650mg)', sell: 33.50, buy: 24.00, rack: 'A-02' },
    { trade: 'Azithral 500 Tablet', generic: 'Azithromycin (500mg)', sell: 132.00, buy: 98.00, rack: 'A-03' },
    { trade: 'Pantocid 40 Tablet', generic: 'Pantoprazole (40mg)', sell: 165.00, buy: 122.00, rack: 'B-01' },
    { trade: 'Pan-D Capsule', generic: 'Pantoprazole + Domperidone (40mg+30mg)', sell: 198.00, buy: 145.00, rack: 'B-02' },
    { trade: 'Glycomet GP 1 Tablet', generic: 'Metformin + Glimepiride (500mg+1mg)', sell: 115.00, buy: 84.00, rack: 'B-03' },
    { trade: 'Telma 40 Tablet', generic: 'Telmisartan (40mg)', sell: 220.00, buy: 160.00, rack: 'C-01' },
    { trade: 'Montair LC Tablet', generic: 'Montelukast + Levocetirizine (10mg+5mg)', sell: 185.00, buy: 138.00, rack: 'C-02' },
    { trade: 'Combiflam Tablet', generic: 'Ibuprofen + Paracetamol (400mg+325mg)', sell: 46.00, buy: 34.00, rack: 'C-03' },
    { trade: 'Voveran SR 100 Tablet', generic: 'Diclofenac Sodium (100mg)', sell: 178.00, buy: 130.00, rack: 'D-01' },
    { trade: 'Shelcal 500 Tablet', generic: 'Calcium + Vitamin D3 (500mg+250IU)', sell: 135.00, buy: 99.00, rack: 'D-02' },
    { trade: 'Becosules Capsules', generic: 'Vitamin B Complex + Vitamin C', sell: 55.00, buy: 41.00, rack: 'D-03' },
    { trade: 'Allegra 120mg Tablet', generic: 'Fexofenadine Hydrochloride (120mg)', sell: 215.00, buy: 162.00, rack: 'E-01' },
    { trade: 'Calpol 500 Tablet', generic: 'Paracetamol (500mg)', sell: 21.00, buy: 15.50, rack: 'E-02' },
    { trade: 'Ascoril D Plus Syrup (100ml)', generic: 'Dextromethorphan + Chlorpheniramine + Phenylephrine', sell: 128.00, buy: 94.00, rack: 'S-01' },
    { trade: 'Cheston Cold Tablet', generic: 'Cetirizine + Paracetamol + Phenylephrine', sell: 62.00, buy: 45.00, rack: 'S-02' },
    { trade: 'Omez 20 Capsule', generic: 'Omeprazole (20mg)', sell: 88.00, buy: 64.00, rack: 'F-01' },
    { trade: 'Amlokind 5 Tablet', generic: 'Amlodipine (5mg)', sell: 42.00, buy: 29.00, rack: 'F-02' },
    { trade: 'Atorva 10 Tablet', generic: 'Atorvastatin (10mg)', sell: 145.00, buy: 105.00, rack: 'F-03' },
    { trade: 'Cetirizine 10mg (Cetzine)', generic: 'Cetirizine Dihydrochloride (10mg)', sell: 38.00, buy: 26.00, rack: 'G-01' },
    { trade: 'Livogen-Z Captabs', generic: 'Ferrous Fumarate + Folic Acid + Zinc', sell: 92.00, buy: 68.00, rack: 'G-02' },
    { trade: 'Supradyn Daily Tablet', generic: 'Multivitamin + Multimineral Complex', sell: 68.00, buy: 49.00, rack: 'G-03' },
    { trade: 'Deriphyllin Retard 150', generic: 'Theophylline + Etophylline (150mg)', sell: 35.00, buy: 24.50, rack: 'H-01' },
    { trade: 'Monocef 1g Injection', generic: 'Ceftriaxone Sodium (1000mg)', sell: 75.00, buy: 54.00, rack: 'INJ-01' },
    { trade: 'Betadine 10% Ointment (20g)', generic: 'Povidone Iodine (10% w/w)', sell: 125.00, buy: 92.00, rack: 'OINT-01' },
  ];

  const medicines: Medicine[] = rawMedicines.map((item, idx) => ({
    id: `med-${idx + 1}`,
    code: formatMedicineCode(idx + 1),
    tradeName: item.trade,
    genericName: item.generic,
    sellingPrice: item.sell,
    purchasePrice: item.buy,
    rackNo: item.rack,
  }));

  // Distribute medicines among vendors (each medicine linked to 1-2 vendors)
  medicines.forEach((med, idx) => {
    const primaryVendor = vendors[idx % vendors.length];
    primaryVendor.medicineIds.push(med.id);
    if (idx % 3 === 0) {
      const secondaryVendor = vendors[(idx + 2) % vendors.length];
      if (!secondaryVendor.medicineIds.includes(med.id)) {
        secondaryVendor.medicineIds.push(med.id);
      }
    }
  });

  // Generate Batches relative to baseDate
  // We want:
  // - 4-5 expired batches with stock (for Expiry tab test)
  // - 4-5 near-expiry batches (< 30 days)
  // - Multiple batches for fast movers (Dolo, Augmentin, Pantocid) to demonstrate FEFO
  // - Healthy batches for all medicines
  const batches: StockBatch[] = [];
  let batchCounter = 1;

  medicines.forEach((med, idx) => {
    const vendor = vendors.find((v) => v.medicineIds.includes(med.id)) || vendors[0];

    // Main healthy batch (expires 6 to 18 months ahead)
    batches.push({
      id: `batch-${batchCounter++}`,
      medicineId: med.id,
      batchNo: `B-${2026 + (idx % 2)}-${100 + idx}`,
      expiryDate: format(addDays(baseDate, randomInt(180, 500)), 'yyyy-MM-dd'),
      quantity: randomInt(30, 120),
      vendorId: vendor.id,
    });

    // Fast movers have a second earlier batch to demonstrate FEFO
    if (idx < 8) {
      batches.push({
        id: `batch-${batchCounter++}`,
        medicineId: med.id,
        batchNo: `FEFO-${100 + idx}`,
        expiryDate: format(addDays(baseDate, randomInt(35, 90)), 'yyyy-MM-dd'),
        quantity: randomInt(15, 45),
        vendorId: vendor.id,
      });
    }

    // A few near-expiry batches (< 30 days from today)
    if (idx === 3 || idx === 7 || idx === 12 || idx === 17) {
      batches.push({
        id: `batch-${batchCounter++}`,
        medicineId: med.id,
        batchNo: `NR-EXP-${100 + idx}`,
        expiryDate: format(addDays(baseDate, randomInt(5, 25)), 'yyyy-MM-dd'),
        quantity: randomInt(10, 25),
        vendorId: vendor.id,
      });
    }

    // A few expired batches (expired 10 to 60 days ago) with remaining stock
    if (idx === 1 || idx === 4 || idx === 9 || idx === 14 || idx === 20) {
      batches.push({
        id: `batch-${batchCounter++}`,
        medicineId: med.id,
        batchNo: `EXP-${200 + idx}`,
        expiryDate: format(subDays(baseDate, randomInt(10, 60)), 'yyyy-MM-dd'),
        quantity: randomInt(8, 30),
        vendorId: vendor.id,
      });
    }
  });

  // Generate ~6 weeks (42 days) of realistic sales history
  const sales: Sale[] = [];
  let receiptCounter = 1001;

  for (let dayOffset = 42; dayOffset >= 0; dayOffset--) {
    const saleDate = subDays(baseDate, dayOffset);
    // 1 to 3 sales per day
    const salesToday = dayOffset === 0 ? 2 : randomInt(1, 3);

    for (let s = 0; s < salesToday; s++) {
      const itemsCount = randomInt(1, 4);
      const saleItems: Sale['items'] = [];
      let totalAmount = 0;

      // Pick unique medicines for this sale
      const pickedMedIndices = new Set<number>();
      while (pickedMedIndices.size < itemsCount) {
        pickedMedIndices.add(randomInt(0, medicines.length - 1));
      }

      for (const mIdx of Array.from(pickedMedIndices)) {
        const med = medicines[mIdx];
        const qty = randomInt(1, 6);
        const unitPrice = med.sellingPrice;
        const unitCost = med.purchasePrice;

        saleItems.push({
          medicineId: med.id,
          batchNo: `B-${2026}-${100 + mIdx}`,
          quantity: qty,
          unitPrice,
          unitCost,
        });

        totalAmount += qty * unitPrice;
      }

      // Add realistic hour/minute to the timestamp
      const saleDateTime = new Date(saleDate);
      saleDateTime.setHours(randomInt(9, 21), randomInt(0, 59), randomInt(0, 59));

      sales.push({
        id: `sale-seed-${receiptCounter}`,
        receiptNo: formatReceiptNo(receiptCounter++),
        createdAt: saleDateTime.toISOString(),
        totalAmount: Number(totalAmount.toFixed(2)),
        items: saleItems,
      });
    }
  }

  // Generate realistic historical supplies over the past 45 days
  const supplies: Supply[] = [];
  let chequeCounter = 101;

  for (let sIdx = 0; sIdx < 12; sIdx++) {
    const supplyDate = subDays(baseDate, randomInt(2, 45));
    const vendor = vendors[sIdx % vendors.length];
    const suppliedMeds = medicines.filter((m) => vendor.medicineIds.includes(m.id));

    if (suppliedMeds.length > 0) {
      const supplyItems: Supply['items'] = [];
      let totalCost = 0;

      const itemsInSupply = Math.min(suppliedMeds.length, randomInt(2, 4));
      for (let i = 0; i < itemsInSupply; i++) {
        const med = suppliedMeds[i];
        const qty = randomInt(20, 60);
        const unitCost = med.purchasePrice;

        supplyItems.push({
          medicineId: med.id,
          batchNo: `SUP-${sIdx}-${i + 1}`,
          expiryDate: format(addDays(supplyDate, 365), 'yyyy-MM-dd'),
          quantity: qty,
          unitCost,
        });

        totalCost += qty * unitCost;
      }

      supplies.push({
        id: `sup-seed-${chequeCounter}`,
        vendorId: vendor.id,
        date: supplyDate.toISOString(),
        totalAmount: Number(totalCost.toFixed(2)),
        chequeNo: formatChequeNo(chequeCounter++),
        items: supplyItems,
      });
    }
  }

  // Sort sales and supplies newest first
  sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  supplies.sort((a, b) => b.date.localeCompare(a.date));

  const settings: Settings = {
    salesWindowDays: 28,
    coverMultiplier: 1.0,
    shopName: 'Sanjivani Medical & General Store',
    shopAddress: 'Shop No. 4, Market Complex, Civil Hospital Road, Pune - 411001',
    shopPhone: '+91 98230 45678',
    shopGst: '27AABCS1429B1Z2',
  };

  const counters: Counters = {
    nextMedicineNo: medicines.length + 1,
    nextChequeNo: chequeCounter,
    nextReceiptNo: receiptCounter,
  };

  return {
    medicines,
    vendors,
    batches,
    supplies,
    sales,
    settings,
    counters,
    bannerDismissed: false,
  };
}
