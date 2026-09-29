import { describe, it, expect } from 'vitest';
import { formatChequeNo, formatMedicineCode, formatReceiptNo } from '../lib/services/codegen';

describe('codegen', () => {
  it('formats medicine codes with leading zeros', () => {
    expect(formatMedicineCode(1)).toBe('MED-0001');
    expect(formatMedicineCode(25)).toBe('MED-0025');
    expect(formatMedicineCode(1234)).toBe('MED-1234');
  });

  it('formats receipt numbers', () => {
    expect(formatReceiptNo(1)).toBe('REC-000001');
    expect(formatReceiptNo(1045)).toBe('REC-001045');
  });

  it('formats cheque numbers', () => {
    expect(formatChequeNo(1)).toBe('CHQ-000001');
    expect(formatChequeNo(501)).toBe('CHQ-000501');
  });
});
