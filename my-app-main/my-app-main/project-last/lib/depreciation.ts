
type DepreciationInput = {
  price: number;
  purchaseDate: string;
  depreciationRate?: number;
  usefulLifeYears?: number;
};

export const today = () => new Date().toISOString().slice(0, 10);

export const baht = (n: number) =>
  n.toLocaleString("th-TH") + " บาท";

export function yearlyDepreciation(
  price: number,
  depreciationRate: number
): number {
  return depreciationRate > 0
    ? Math.round((price * depreciationRate) / 100)
    : 0;
}

export function monthlyDepreciation(
  price: number,
  depreciationRate: number
): number {
  return depreciationRate > 0
    ? Math.round((price * depreciationRate) / 100 / 12)
    : 0;
}

export function remainingValue(
  asset: DepreciationInput,
  now: Date
): number {
  const rate =
    typeof asset.depreciationRate === "number"
      ? asset.depreciationRate
      : typeof asset.usefulLifeYears === "number" &&
          asset.usefulLifeYears > 0
        ? 100 / asset.usefulLifeYears
        : 0;

  if (rate <= 0) {
    return Math.max(0, Math.round(asset.price));
  }

  const purchaseTime = new Date(asset.purchaseDate).getTime();

  if (Number.isNaN(purchaseTime)) {
    return Math.max(0, Math.round(asset.price));
  }

  const msPerYear = 365.25 * 24 * 3600 * 1000;

  const years = Math.max(
    0,
    (now.getTime() - purchaseTime) / msPerYear
  );

  const remaining = asset.price * (1 - (rate / 100) * years);

  return Math.max(0, Math.round(remaining));
}
