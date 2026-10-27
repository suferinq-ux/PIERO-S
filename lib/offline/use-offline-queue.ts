"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getPendingSales } from "./db";
import { flushPendingSales } from "./sync";

/** Hook que expone las ventas pendientes y las sincroniza al recuperar señal. */
export function useOfflineQueue() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPending((await getPendingSales()).length);
    } catch {
      // IndexedDB no disponible (SSR o navegador restringido).
    }
  }, []);

  const flush = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await flushPendingSales();
      await refresh();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    const onOnline = () => {
      flush().then((r) => {
        if (r.synced > 0) toast.success(`${r.synced} venta(s) sincronizada(s)`);
      });
    };
    window.addEventListener("online", onOnline);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      flush().then((r) => {
        if (r.synced > 0) toast.success(`${r.synced} venta(s) sincronizada(s)`);
      });
    }
    return () => window.removeEventListener("online", onOnline);
  }, [flush, refresh]);

  return { pending, syncing, flush, refresh };
}
