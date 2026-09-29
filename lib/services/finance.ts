import { FinancialSummary, Sale, Supply, Vendor } from '../types';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

/**
 * Calculates financial metrics: Revenue, COGS, Gross Profit, daily timeline, and vendor payments for a date window.
 */
export function calculateFinancials(
  sales: Sale[],
  supplies: Supply[],
  vendors: Vendor[],
  startDate?: Date,
  endDate?: Date
): FinancialSummary {
  const start = startDate ? startOfDay(startDate) : undefined;
  const end = endDate ? endOfDay(endDate) : undefined;

  // Filter sales within date range
  const filteredSales = sales.filter((sale) => {
    const saleDate = typeof sale.createdAt === 'string' ? parseISO(sale.createdAt) : sale.createdAt;
    if (start && saleDate < start) return false;
    if (end && saleDate > end) return false;
    return true;
  });

  // Filter supplies within date range
  const filteredSupplies = supplies.filter((supply) => {
    const supplyDate = typeof supply.date === 'string' ? parseISO(supply.date) : supply.date;
    if (start && supplyDate < start) return false;
    if (end && supplyDate > end) return false;
    return true;
  });

  let totalRevenue = 0;
  let totalCogs = 0;

  // Daily aggregations
  const dailyMap = new Map<string, { revenue: number; cogs: number; profit: number }>();

  for (const sale of filteredSales) {
    const saleDate = typeof sale.createdAt === 'string' ? parseISO(sale.createdAt) : sale.createdAt;
    const dateKey = format(saleDate, 'yyyy-MM-dd');

    let saleRev = 0;
    let saleCogs = 0;

    for (const item of sale.items) {
      const lineRev = item.quantity * item.unitPrice;
      const lineCost = item.quantity * item.unitCost;
      saleRev += lineRev;
      saleCogs += lineCost;
    }

    totalRevenue += saleRev;
    totalCogs += saleCogs;

    const dayStat = dailyMap.get(dateKey) || { revenue: 0, cogs: 0, profit: 0 };
    dayStat.revenue += saleRev;
    dayStat.cogs += saleCogs;
    dayStat.profit += (saleRev - saleCogs);
    dailyMap.set(dateKey, dayStat);
  }

  const grossProfit = totalRevenue - totalCogs;
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Sort daily trends by date
  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({
      date,
      revenue: Number(stats.revenue.toFixed(2)),
      cogs: Number(stats.cogs.toFixed(2)),
      profit: Number(stats.profit.toFixed(2)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Vendor payments aggregation
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));
  const vendorPaymentMap = new Map<
    string,
    { vendorId: string; totalAmount: number; count: number; lastDate: string }
  >();

  for (const supply of filteredSupplies) {
    const existing = vendorPaymentMap.get(supply.vendorId) || {
      vendorId: supply.vendorId,
      totalAmount: 0,
      count: 0,
      lastDate: supply.date,
    };

    existing.totalAmount += supply.totalAmount;
    existing.count += 1;
    if (supply.date > existing.lastDate) {
      existing.lastDate = supply.date;
    }

    vendorPaymentMap.set(supply.vendorId, existing);
  }

  const vendorPayments = Array.from(vendorPaymentMap.values()).map((item) => {
    const vendor = vendorMap.get(item.vendorId);
    return {
      vendorId: item.vendorId,
      vendorName: vendor ? vendor.name : 'Unknown Vendor',
      totalAmount: Number(item.totalAmount.toFixed(2)),
      suppliesCount: item.count,
      lastPaymentDate: item.lastDate,
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    revenue: Number(totalRevenue.toFixed(2)),
    cogs: Number(totalCogs.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    marginPercent: Number(marginPercent.toFixed(1)),
    salesCount: filteredSales.length,
    dailyTrend,
    vendorPayments,
  };
}
