import { format, parseISO, startOfDay } from 'date-fns';

/**
 * Format a number as Indian Rupee currency (e.g. ₹1,23,456.78 or ₹1,23,456)
 */
export function formatINR(amount: number, showDecimals: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return showDecimals ? '₹0.00' : '₹0';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const parts = absAmount.toFixed(showDecimals ? 2 : 0).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian number formatting: last 3 digits, then groups of 2 digits
  let result = '';
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = formattedOther + ',' + lastThree;
  } else {
    result = integerPart;
  }

  if (showDecimals && decimalPart !== undefined) {
    result += '.' + decimalPart;
  }

  return (isNegative ? '-₹' : '₹') + result;
}

/**
 * Format date string or Date object to "DD MMM YYYY" (e.g. "29 Sep 2026")
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy');
  } catch {
    return String(date);
  }
}

/**
 * Format date-time string or Date object to "DD MMM YYYY, hh:mm a"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return String(date);
  }
}

/**
 * Checks if a batch expiry date is considered expired relative to a reference date.
 * A batch with expiryDate "2026-09-01" is expired if referenceDate >= 2026-09-02 (or end of expiry day).
 * We compare startOfDay(parseISO(expiryDate)) < startOfDay(referenceDate).
 */
export function isBatchExpired(expiryDate: string, referenceDate: Date = new Date()): boolean {
  if (!expiryDate) return false;
  const exp = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
  return startOfDay(exp) < startOfDay(referenceDate);
}

/**
 * Checks if a batch will expire within a specified number of days (default 30)
 */
export function isExpiringSoon(expiryDate: string, daysAhead: number = 30, referenceDate: Date = new Date()): boolean {
  if (isBatchExpired(expiryDate, referenceDate)) return false;
  const exp = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
  const threshold = new Date(startOfDay(referenceDate).getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return startOfDay(exp) <= threshold;
}
