"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { settingsRepository, type BusinessSettings } from "../repository";

export function ConfiguracionManager() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["business-settings"],
    queryFn: settingsRepository.get,
  });

  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (value: BusinessSettings) => settingsRepository.save(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
      toast.success("Configuración guardada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !settings) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del negocio</CardTitle>
          <CardDescription>Nombre, RUC y logo de PIERO&apos;S.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input
              value={settings.negocio.nombre}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  negocio: { ...settings.negocio, nombre: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>RUC</Label>
            <Input
              value={settings.negocio.ruc}
              onChange={(e) =>
                setSettings({ ...settings, negocio: { ...settings.negocio, ruc: e.target.value } })
              }
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Dirección</Label>
            <Input
              value={settings.negocio.direccion}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  negocio: { ...settings.negocio, direccion: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>URL del logo</Label>
            <Input
              placeholder="/logo.svg o https://…"
              value={settings.negocio.logo_url}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  negocio: { ...settings.negocio, logo_url: e.target.value },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impuestos</CardTitle>
          <CardDescription>Configuración de IGV para las ventas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.impuestos.igv_enabled}
              onCheckedChange={(v) =>
                setSettings({ ...settings, impuestos: { ...settings.impuestos, igv_enabled: v } })
              }
            />
            <Label>Aplicar IGV</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground">Tasa</Label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.01"
              className="w-24"
              value={settings.impuestos.igv_rate}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  impuestos: { ...settings.impuestos, igv_rate: Number(e.target.value) || 0 },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket</CardTitle>
          <CardDescription>Ancho e impresión del comprobante.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Ancho (mm)</Label>
            <Input
              type="number"
              value={settings.ticket.ancho_mm}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ticket: { ...settings.ticket, ancho_mm: Number(e.target.value) || 80 },
                })
              }
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Pie del ticket</Label>
            <Input
              value={settings.ticket.pie}
              onChange={(e) =>
                setSettings({ ...settings, ticket: { ...settings.ticket, pie: e.target.value } })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate(settings)} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </div>
  );
}
