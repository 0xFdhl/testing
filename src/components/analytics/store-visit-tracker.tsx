"use client";

import { useEffect } from "react";
import { getMonthKey } from "@/lib/store-time";

export function StoreVisitTracker() {
  useEffect(() => {
    const storageKey = "varcasvi_store_visit_month";
    const month = getMonthKey(new Date());

    try {
      if (window.sessionStorage.getItem(storageKey) === month) return;
    } catch {
      // Tracking can still proceed when browser storage is unavailable.
    }

    void fetch("/api/analytics/visit", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) return;
        try {
          window.sessionStorage.setItem(storageKey, month);
        } catch {
          // Tracking remains valid even when browser storage is unavailable.
        }
      })
      .catch(() => {
        // Analytics must never interrupt the shopping experience.
      });
  }, []);

  return null;
}
