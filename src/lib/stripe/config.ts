import "server-only";

function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getStripeSecretKey(): string {
  const key = readEnv("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. " +
        "Buat file .env.local dari .env.example lalu isi Stripe Secret Key.",
    );
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = readEnv("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not configured. " +
        "Set Stripe webhook secret di .env.local.",
    );
  }
  return secret;
}

export function getStripePublishableKey(): string | undefined {
  return readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

export function isStripeTestMode(): boolean {
  const key = getStripeSecretKey();
  return key.startsWith("sk_test_");
}
