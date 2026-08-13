"use client";

import { useActionState } from "react";
import {
  updateSettingsAction,
  type ActionResult,
} from "@/lib/admin-actions";

type SettingsFormProps = {
  xenditMode: "test" | "live";
  appUrl: string;
  webhookUrl: string;
  secretKeyMasked: string;
  webhookTokenConfigured: boolean;
  securityHeaders: { name: string; ok: boolean }[];
  adminsCanEditPhotos: boolean;
  canManagePhotoToggle: boolean;
};

export function SettingsForm({
  xenditMode,
  appUrl,
  webhookUrl,
  secretKeyMasked,
  webhookTokenConfigured,
  securityHeaders,
  adminsCanEditPhotos,
  canManagePhotoToggle,
}: SettingsFormProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult,
    FormData
  >(updateSettingsAction, { success: false });

  async function copyWebhookUrl() {
    await navigator.clipboard.writeText(webhookUrl);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure payment and application settings
        </p>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          Settings saved.
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-lg font-medium text-white">Xendit</h2>

          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm text-zinc-300">Mode</span>
              <p className="text-xs text-zinc-500">
                Live mode processes real payments
              </p>
            </div>
            <select
              name="xenditMode"
              defaultValue={xenditMode}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <option value="test">Test (Sandbox)</option>
              <option value="live">Live (Production)</option>
            </select>
          </label>

          {xenditMode === "live" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
              Warning: Live mode will charge real money. Ensure your API keys and
              webhook are configured for production.
            </div>
          )}

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Secret key</dt>
              <dd className="font-mono text-zinc-300">{secretKeyMasked}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Webhook token</dt>
              <dd className={webhookTokenConfigured ? "text-emerald-400" : "text-red-400"}>
                {webhookTokenConfigured ? "Configured" : "Not configured"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-lg font-medium text-white">Application</h2>

          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">App URL</span>
            <input
              name="appUrl"
              type="url"
              defaultValue={appUrl}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-sm text-zinc-400">Webhook URL</span>
            <div className="flex gap-2">
              <input
                readOnly
                value={webhookUrl}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              />
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                Copy
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-lg font-medium text-white">Permissions</h2>
          <label className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm text-zinc-300">
                Allow admins to edit product photos
              </span>
              <p className="text-xs text-zinc-500">
                When off, only SUPERADMIN can edit photos.
                {!canManagePhotoToggle && " (SUPERADMIN only)"}
              </p>
            </div>
            <input
              type="checkbox"
              name="adminsCanEditPhotos"
              value="on"
              defaultChecked={adminsCanEditPhotos}
              disabled={!canManagePhotoToggle}
              className="h-5 w-5 rounded border-zinc-700 bg-zinc-950 accent-white disabled:opacity-50"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-lg font-medium text-white">Security Headers</h2>
          <ul className="space-y-2">
            {securityHeaders.map((header) => (
              <li
                key={header.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-400">{header.name}</span>
                <span className={header.ok ? "text-emerald-400" : "text-amber-400"}>
                  {header.ok ? "Active" : "Not configured"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
