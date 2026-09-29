import { describe, it, expect } from 'vitest';
import { numberToWordsIndian } from '../lib/services/numberToWords';

describe('numberToWordsIndian', () => {
  it('converts zero correctly', () => {
    expect(numberToWordsIndian(0)).toBe('Rupees Zero Only');
  });

  it('converts small numbers', () => {
    expect(numberToWordsIndian(5)).toBe('Rupees Five Only');
    expect(numberToWordsIndian(15)).toBe('Rupees Fifteen Only');
    expect(numberToWordsIndian(42)).toBe('Rupees Forty Two Only');
    expect(numberToWordsIndian(100)).toBe('Rupees One Hundred Only');
    expect(numberToWordsIndian(750)).toBe('Rupees Seven Hundred Fifty Only');
  });

  it('converts thousands, lakhs, and crores', () => {
    expect(numberToWordsIndian(1000)).toBe('Rupees One Thousand Only');
    expect(numberToWordsIndian(25000)).toBe('Rupees Twenty Five Thousand Only');
    expect(numberToWordsIndian(100000)).toBe('Rupees One Lakh Only');
    expect(numberToWordsIndian(123456)).toBe('Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six Only');
    expect(numberToWordsIndian(10000000)).toBe('Rupees One Crore Only');
    expect(numberToWordsIndian(25075120)).toBe('Rupees Two Crore Fifty Lakh Seventy Five Thousand One Hundred Twenty Only');
  });

  it('handles decimal paise correctly', () => {
    expect(numberToWordsIndian(500.50)).toBe('Rupees Five Hundred and Paise Fifty Only');
    expect(numberToWordsIndian(0.75)).toBe('Paise Seventy Five Only');
    expect(numberToWordsIndian(125000.25)).toBe('Rupees One Lakh Twenty Five Thousand and Paise Twenty Five Only');
  });
});
