const toSafeNumber = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
};

const DEFAULT_INR_OPTIONS: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
};

export const formatCurrencyINR = (
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
) => {
  const safe = toSafeNumber(value);
  return new Intl.NumberFormat("en-IN", {
    ...DEFAULT_INR_OPTIONS,
    ...options,
  }).format(safe);
};

export const formatCurrencyINRCompact = (value: number | null | undefined) => {
  const safe = toSafeNumber(value);
  if (Math.abs(safe) >= 100000) {
    return `${formatCurrencyINR(safe / 100000, { maximumFractionDigits: 1 })}L`;
  }
  return formatCurrencyINR(safe);
};
