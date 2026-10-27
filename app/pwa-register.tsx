"use client";

import { useEffect } from "react";

/** Registra el service worker de la PWA (solo en producción y con soporte). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registro silencioso: la app sigue funcionando sin SW.
    });
  }, []);

  return null;
}
