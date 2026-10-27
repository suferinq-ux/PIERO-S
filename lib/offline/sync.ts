"use client";

import { ventaRepository } from "@/features/ventas/repository";
import { getPendingSales, incrementAttempts, removePendingSale } from "./db";

/** Sincroniza las ventas encoladas offline contra la RPC `registrar_venta`. */
export async function flushPendingSales(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingSales();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await ventaRepository.registrar(item.payload);
      await removePendingSale(item.id);
      synced++;
    } catch {
      await incrementAttempts(item.id);
      failed++;
    }
  }

  return { synced, failed };
}

/** Detecta si un error se debe a falta de conexión (y no a una regla de negocio). */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network|fetch failed|load failed|connection/i.test(msg);
}
