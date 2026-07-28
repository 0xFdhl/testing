"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
} from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { retryWebhookAction } from "@/lib/admin-actions";
import { formatDate } from "@/lib/format-admin";

type WebhookEvent = {
  id: string;
  eventId: string;
  type: string;
  status: string;
  payload: unknown;
  processedAt: string | null;
};

export function WebhooksMonitor({
  initialEvents,
}: {
  initialEvents: WebhookEvent[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState<WebhookEvent | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/webhooks");
      if (res.ok) {
        const data = (await res.json()) as { events: WebhookEvent[] };
        setEvents(data.events);
      }
    } catch {
      // ignore refresh errors
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Webhooks</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Auto-refreshes every 10 seconds
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Refresh now
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState message="No webhook events recorded yet." />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Event ID</DataTableHeaderCell>
              <DataTableHeaderCell>Type</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Processed At</DataTableHeaderCell>
              <DataTableHeaderCell>Actions</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {events.map((event) => (
              <DataTableRow key={event.id}>
                <DataTableCell className="font-mono text-xs">
                  {event.eventId}
                </DataTableCell>
                <DataTableCell>{event.type}</DataTableCell>
                <DataTableCell>
                  <StatusBadge status={event.status} />
                </DataTableCell>
                <DataTableCell>{formatDate(event.processedAt)}</DataTableCell>
                <DataTableCell>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(event)}
                      className="rounded-sm text-sm text-zinc-300 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    >
                      View JSON
                    </button>
                    {event.status === "failed" && (
                      <ConfirmDialog
                        title="Retry webhook"
                        description={`Retry processing event ${event.eventId}?`}
                        confirmLabel="Retry"
                        onConfirm={async () => { await retryWebhookAction(event.eventId); }}
                        trigger={
                          <button
                            type="button"
                            className="rounded-sm text-sm text-amber-400 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                          >
                            Retry
                          </button>
                        }
                      />
                    )}
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {selected && (
        <dialog
          open
          onClose={() => setSelected(null)}
          className="fixed inset-0 z-50 m-auto w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 p-0 text-white backdrop:bg-black/60"
        >
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payload — {selected.eventId}</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-sm text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              >
                Close
              </button>
            </div>
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-300">
              {JSON.stringify(selected.payload ?? {}, null, 2)}
            </pre>
          </div>
        </dialog>
      )}
    </div>
  );
}
