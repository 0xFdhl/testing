/** Client-safe flag for UI test banner — no server-only import */
export function isPublicStripeTestMode(): boolean {
  return (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_") !== "pk_live_";
}
