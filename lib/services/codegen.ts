/**
 * Pure code generation services for sequential IDs.
 */

export function formatMedicineCode(num: number): string {
  const safeNum = Math.max(1, Math.floor(num));
  return `MED-${safeNum.toString().padStart(4, '0')}`;
}

export function formatReceiptNo(num: number): string {
  const safeNum = Math.max(1, Math.floor(num));
  return `REC-${safeNum.toString().padStart(6, '0')}`;
}

export function formatChequeNo(num: number): string {
  const safeNum = Math.max(1, Math.floor(num));
  return `CHQ-${safeNum.toString().padStart(6, '0')}`;
}
