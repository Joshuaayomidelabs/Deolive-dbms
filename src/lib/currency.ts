export type CurrencyCode = 'USD' | 'NGN' | 'GBP' | 'EUR';

export const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; label: string; prefix: string }> = {
  USD: { symbol: '$', label: 'USD ($)', prefix: '$' },
  NGN: { symbol: '₦', label: 'NGN (₦)', prefix: '₦' },
  GBP: { symbol: '£', label: 'GBP (£)', prefix: '£' },
  EUR: { symbol: '€', label: 'EUR (€)', prefix: '€' },
};

export const normalizeCurrencyCode = (currency?: string | null): CurrencyCode => {
  if (!currency) return 'USD';
  const upper = currency.toUpperCase() as CurrencyCode;
  if (upper in CURRENCY_CONFIG) return upper;
  return 'USD';
};

export const formatCurrency = (
  val: number | string | null | undefined,
  currencyCode?: string | null,
  options?: {
    withSign?: boolean;
    type?: 'Income' | 'Expense';
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string => {
  const num = typeof val === 'number' ? val : Number(val || 0);
  const code = normalizeCurrencyCode(currencyCode);
  const cfg = CURRENCY_CONFIG[code] || CURRENCY_CONFIG.USD;
  
  const minDigits = options?.minimumFractionDigits ?? 2;
  const maxDigits = options?.maximumFractionDigits ?? 2;

  const formattedNum = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  });

  if (options?.withSign) {
    const sign = options.type === 'Expense' || num < 0 ? '-' : '+';
    return `${sign}${cfg.symbol}${formattedNum}`;
  }

  return `${cfg.symbol}${formattedNum}`;
};
