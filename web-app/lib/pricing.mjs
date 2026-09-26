export const priceFields = [
  { key: 'off65', label: '65% off', factor: 3500 },
  { key: 'off75', label: '75% off', factor: 2500 },
  { key: 'off65Plus18', label: '65% off + 18%', factor: 4130 },
  { key: 'off75Plus18', label: '75% off + 18%', factor: 2950 },
  { key: 'off65Plus9', label: '65% off + 9%', factor: 3815 },
  { key: 'off75Plus9', label: '75% off + 9%', factor: 2725 },
];

/** @param {number | null | undefined} listedPrice */
export function calculatedPrices(listedPrice) {
  return priceFields.map(({ factor }) => {
    if (listedPrice == null) return null;
    return Math.round(listedPrice * factor / 100 + Number.EPSILON) / 100;
  });
}

/** @param {number | null | undefined} value */
export function priceAmount(value) {
  return value == null ? '—' : new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}
