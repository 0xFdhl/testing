import { SettingsForm } from "@/components/admin/settings-form";
import {
  getAdminsCanEditPhotos,
  getEffectiveAppUrl,
  getEffectiveXenditMode,
} from "@/lib/admin-actions";
import { getSession } from "@/lib/auth";
import { maskSecret } from "@/lib/format-admin";
import {
  getXenditSecretKey,
  getXenditWebhookToken,
} from "@/lib/xendit/config";

export default async function AdminSettingsPage() {
  const [xenditMode, appUrl, adminsCanEditPhotos, session] = await Promise.all([
    getEffectiveXenditMode(),
    getEffectiveAppUrl(),
    getAdminsCanEditPhotos(),
    getSession(),
  ]);

  const canManagePhotoToggle = session?.role === "SUPERADMIN";

  let secretKeyMasked = "Not configured";
  let webhookTokenConfigured = false;

  try {
    secretKeyMasked = maskSecret(getXenditSecretKey());
    webhookTokenConfigured = Boolean(getXenditWebhookToken());
  } catch {
    // keys not configured
  }

  const webhookUrl = `${appUrl}/api/webhook/xendit`;

  const securityHeaders = [
    { name: "HttpOnly session cookie", ok: true },
    { name: "Secure cookie (production)", ok: process.env.NODE_ENV === "production" },
    { name: "CSRF protection (Server Actions)", ok: true },
    { name: "Login rate limiting", ok: true },
    { name: "Webhook token verification", ok: webhookTokenConfigured },
  ];

  return (
    <SettingsForm
      xenditMode={xenditMode}
      appUrl={appUrl}
      webhookUrl={webhookUrl}
      secretKeyMasked={secretKeyMasked}
      webhookTokenConfigured={webhookTokenConfigured}
      securityHeaders={securityHeaders}
      adminsCanEditPhotos={adminsCanEditPhotos}
      canManagePhotoToggle={canManagePhotoToggle}
    />
  );
}
