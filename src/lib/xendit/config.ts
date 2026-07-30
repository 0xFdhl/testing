import "server-only";

export type XenditMode = "test" | "live";

let cachedMode: XenditMode | null = null;

export function setXenditMode(mode: XenditMode): void {
  cachedMode = mode;
}

export function getXenditMode(): XenditMode {
  if (cachedMode) return cachedMode;
  const mode = process.env.XENDIT_MODE ?? "test";
  return mode === "live" ? "live" : "test";
}

export function isXenditTestMode(): boolean {
  return getXenditMode() === "test";
}

export type XenditCredentials = {
  mode: XenditMode;
  secretKey: string;
  publicKey?: string;
  webhookToken?: string;
};

function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function requireSecretKey(mode: XenditMode): string {
  const key =
    mode === "live"
      ? readEnv("XENDIT_LIVE_SECRET_KEY", "XENDIT_SECRET_KEY")
      : readEnv("XENDIT_TEST_SECRET_KEY", "XENDIT_SECRET_KEY");

  if (!key) {
    const varName =
      mode === "live" ? "XENDIT_LIVE_SECRET_KEY" : "XENDIT_TEST_SECRET_KEY";
    throw new Error(
      `${varName} is not configured (XENDIT_MODE=${mode}). ` +
        `Buat file .env.local dari .env.example lalu isi Test Secret Key dari Xendit Dashboard.`,
    );
  }

  return key;
}

/** Hanya Secret Key yang wajib untuk create/get Invoice */
export function getXenditSecretKey(): string {
  return requireSecretKey(getXenditMode());
}

/** Public key opsional — hosted checkout Invoice tidak butuh ini */
export function getXenditPublicKey(): string | undefined {
  const mode = getXenditMode();
  return mode === "live"
    ? readEnv("XENDIT_LIVE_PUBLIC_KEY", "XENDIT_PUBLIC_KEY")
    : readEnv("XENDIT_TEST_PUBLIC_KEY", "XENDIT_PUBLIC_KEY");
}

/** Webhook token opsional sampai webhook di-setup */
export function getXenditWebhookToken(): string | undefined {
  const mode = getXenditMode();
  return mode === "live"
    ? readEnv("XENDIT_LIVE_WEBHOOK_TOKEN", "XENDIT_WEBHOOK_TOKEN")
    : readEnv("XENDIT_TEST_WEBHOOK_TOKEN", "XENDIT_WEBHOOK_TOKEN");
}

export function getXenditCredentials(): XenditCredentials {
  const mode = getXenditMode();
  return {
    mode,
    secretKey: requireSecretKey(mode),
    publicKey: getXenditPublicKey(),
    webhookToken: getXenditWebhookToken(),
  };
}

/** Client-safe flag for UI test banner */
export function isPublicXenditTestMode(): boolean {
  return (process.env.NEXT_PUBLIC_XENDIT_MODE ?? "test") !== "live";
}
