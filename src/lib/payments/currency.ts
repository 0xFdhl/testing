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
  if (!Number.isFinite(idr) || idr < 0) {
    throw new PaymentError("invalid amount for currency conversion", {
      userMessage: "Jumlah tidak valid.",
    });
  }
  return Math.round(idr * rateIdrToUsd * 100);
}
