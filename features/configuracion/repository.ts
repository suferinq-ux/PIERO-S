import { createClient } from "@/lib/supabase/client";

export interface BusinessSettings {
  negocio: { nombre: string; ruc: string; direccion: string; logo_url: string };
  impuestos: { igv_enabled: boolean; igv_rate: number };
  ticket: { ancho_mm: number; pie: string };
}

const DEFAULTS: BusinessSettings = {
  negocio: { nombre: "PIERO'S", ruc: "", direccion: "", logo_url: "" },
  impuestos: { igv_enabled: false, igv_rate: 0.18 },
  ticket: { ancho_mm: 80, pie: "Gracias por su compra" },
};

/** Repositorio de configuración del negocio (business_settings clave-valor). */
export const settingsRepository = {
  async get(): Promise<BusinessSettings> {
    const supabase = createClient();
    const { data, error } = await supabase.from("business_settings").select("*");
    if (error) throw new Error(error.message);
    const byKey = new Map(
      (data ?? []).map((r) => [r.key as string, r.value as Record<string, unknown>]),
    );
    const negocio = byKey.get("negocio") ?? {};
    const impuestos = byKey.get("impuestos") ?? {};
    const ticket = byKey.get("ticket") ?? {};
    return {
      negocio: {
        nombre: (negocio.nombre as string) ?? DEFAULTS.negocio.nombre,
        ruc: (negocio.ruc as string) ?? "",
        direccion: (negocio.direccion as string) ?? "",
        logo_url: (negocio.logo_url as string) ?? "",
      },
      impuestos: {
        igv_enabled: (impuestos.igv_enabled as boolean) ?? false,
        igv_rate: (impuestos.igv_rate as number) ?? 0.18,
      },
      ticket: {
        ancho_mm: (ticket.ancho_mm as number) ?? 80,
        pie: (ticket.pie as string) ?? DEFAULTS.ticket.pie,
      },
    };
  },

  async save(settings: BusinessSettings): Promise<void> {
    const supabase = createClient();
    const rows = [
      { key: "negocio", value: settings.negocio },
      { key: "impuestos", value: settings.impuestos },
      { key: "ticket", value: settings.ticket },
    ];
    const { error } = await supabase.from("business_settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
  },
};
