import { PaymentError } from "./errors";

let rateIdrToUsd = Number(process.env.IDR_TO_USD_RATE ?? "0.000064");

export function getRate(): number {
  return rateIdrToUsd;
}

/** Override rate for testing */
export function setRate(rate: number): void {
  rateIdrToUsd = rate;
}

export function resetRate(): void {
  rateIdrToUsd = Number(process.env.IDR_TO_USD_RATE ?? "0.000064");
}

export function idrToUsdCents(idr: number): number {
  if (!Number.isSafeInteger(idr) || idr < 0 || !Number.isFinite(rateIdrToUsd) || rateIdrToUsd <= 0) {
    throw new PaymentError("invalid amount for currency conversion", {
      userMessage: "Jumlah tidak valid.",
    });
  }
  const cents = Math.round(idr * rateIdrToUsd * 100);
  if (!Number.isSafeInteger(cents) || cents > 2_147_483_647) throw new Error("Converted amount exceeds supported range");
  return cents;
}
