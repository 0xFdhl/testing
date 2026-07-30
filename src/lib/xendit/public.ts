/** Client-safe flag for UI test banner — no server-only import */
export function isPublicXenditTestMode(): boolean {
  return (process.env.NEXT_PUBLIC_XENDIT_MODE ?? "test") !== "live";
}
