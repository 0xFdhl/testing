"use client";

import { useActionState, useState } from "react";
import { formatDate } from "@/lib/format-admin";
import {
  testNotificationAction,
  updateNotificationTemplateAction,
  type ActionResult,
} from "@/lib/notification-actions";
import { AVAILABLE_SOUNDS, NOTIFICATION_VARIABLES } from "@/lib/notifications/templates";
import type {
  NotificationLogRecord,
  NotificationTemplateRecord,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

function EventCard({ template }: { template: NotificationTemplateRecord }) {
  const [state, formAction, pending] = useActionState<
    ActionResult,
    FormData
  >(updateNotificationTemplateAction, { success: false });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ActionResult>({ success: false });

  async function handleTest() {
    setTesting(true);
    setTestResult(await testNotificationAction(template.event));
    setTesting(false);
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-mono text-lg font-medium text-white">
          {template.event}
        </h2>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={template.enabled}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-white"
          />
          Enabled
        </label>
      </div>

      {(state.error || testResult.error) && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error ?? testResult.error}
        </div>
      )}
      {state.success && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          Template saved.
        </div>
      )}
      {testResult.success && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          Test notification sent — check the toast on this page.
        </div>
      )}

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="event" value={template.event} />

        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-400">Title</span>
          <input
            name="title"
            type="text"
            defaultValue={template.title}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-400">Message</span>
          <textarea
            name="message"
            rows={3}
            defaultValue={template.message}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          />
        </label>

        <p className="text-xs text-zinc-500">
          Available variables:{" "}
          <code className="text-zinc-400">
            {NOTIFICATION_VARIABLES.map((v) => `{{${v}}}`).join(" ")}
          </code>
        </p>

        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-400">Sound</span>
          <select
            name="sound"
            defaultValue={template.sound ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <option value="">None</option>
            {AVAILABLE_SOUNDS.map((sound) => (
              <option key={sound} value={sound}>
                {sound}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {testing ? "Sending…" : "Test notification"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function NotificationsForm({
  templates,
  logs,
}: {
  templates: NotificationTemplateRecord[];
  logs: NotificationLogRecord[];
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Notifications</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Customize order notification templates, sounds and delivery
        </p>
      </div>

      <div className="space-y-6">
        {templates.map((template) => (
          <EventCard key={template.event} template={template} />
        ))}
      </div>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-medium text-white">Recent activity</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No notifications sent yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{log.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    <span className="font-mono">{log.event}</span>
                    {log.channel !== "realtime" && (
                      <span
                        className={cn(
                          "ml-2",
                          log.channel === "test" ? "text-amber-400" : "text-zinc-400",
                        )}
                      >
                        [{log.channel}]
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-zinc-500">{formatDate(log.createdAt)}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-[11px] font-medium uppercase tracking-wider",
                      log.status === "sent" ? "text-emerald-400" : "text-zinc-500",
                    )}
                  >
                    {log.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}