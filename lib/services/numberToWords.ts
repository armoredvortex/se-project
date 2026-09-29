/**
 * Pure function to convert a number to Indian currency words.
 * Example: 123456 -> "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six Only"
 * Example: 1000.50 -> "Rupees One Thousand and Paise Fifty Only"
 */

const ONES: string[] = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS: string[] = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n > 0) {
      str += ' ';
    }
  }

  if (n > 0) {
    if (n < 20) {
      str += ONES[n];
    } else {
      str += TENS[Math.floor(n / 10)];
      if (n % 10 > 0) {
        str += ' ' + ONES[n % 10];
      }
    }
  }

  return str.trim();
}

export function numberToWordsIndian(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rupees Zero Only';
  }

  const rounded = Math.round(amount * 100) / 100;
  const absAmount = Math.abs(rounded);
  const integerPart = Math.floor(absAmount);
  const paisePart = Math.round((absAmount - integerPart) * 100);

  if (integerPart === 0 && paisePart === 0) {
    return 'Rupees Zero Only';
  }

  let words = '';

  if (integerPart > 0) {
    let num = integerPart;

    // Crores (>= 1,00,00,000)
    const crores = Math.floor(num / 10000000);
    num %= 10000000;

    // Lakhs (>= 1,00,000)
    const lakhs = Math.floor(num / 100000);
    num %= 100000;

    // Thousands (>= 1,000)
    const thousands = Math.floor(num / 1000);
    num %= 1000;

    // Hundreds & remainder (< 1000)
    const remainder = num;

    const parts: string[] = [];

    if (crores > 0) {
      parts.push(convertBelowThousand(crores) + ' Crore');
    }
    if (lakhs > 0) {
      parts.push(convertBelowThousand(lakhs) + ' Lakh');
    }
    if (thousands > 0) {
      parts.push(convertBelowThousand(thousands) + ' Thousand');
    }
    if (remainder > 0) {
      parts.push(convertBelowThousand(remainder));
    }

    words = 'Rupees ' + parts.join(' ');
  } else {
    words = 'Rupees Zero';
  }

  if (paisePart > 0) {
    const paiseWords = convertBelowThousand(paisePart);
    if (integerPart > 0) {
      words += ' and Paise ' + paiseWords;
    } else {
      words = 'Paise ' + paiseWords;
    }
  }

  return words + ' Only';
}
