"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  trigger: React.ReactNode;
  variant?: "default" | "danger";
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  trigger,
  variant = "default",
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-0 text-white backdrop:bg-black/60"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-zinc-400">{description}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
                variant === "danger"
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-zinc-100 text-zinc-900 hover:bg-white",
              )}
            >
              {loading ? "Processing…" : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
