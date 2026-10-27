"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp, Wallet, Receipt, Cake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { formatNumber, formatPEN } from "@/shared/lib/format";
import { dashboardRepository } from "../repository";

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {hint && <div className="text-xs">{hint}</div>}
        </div>
        <div
          className={`rounded-lg p-2 ${
            tone === "negative"
              ? "bg-destructive/10 text-destructive"
              : tone === "positive"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-soft text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardClient() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardRepository.get,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
        <Skeleton className="h-72 w-full sm:col-span-2 xl:col-span-4" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No se pudieron cargar los indicadores.
        </CardContent>
      </Card>
    );
  }

  const variacion =
    data.ventasMesAnterior > 0
      ? ((data.ventasMes - data.ventasMesAnterior) / data.ventasMesAnterior) * 100
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold">Resumen de PIERO&apos;S</h2>
        <p className="text-sm text-muted-foreground">Indicadores de ventas e inventario.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ventas de hoy"
          value={formatPEN(data.ventasHoy)}
          icon={Wallet}
          tone="positive"
        />
        <KpiCard
          label="Ventas del mes"
          value={formatPEN(data.ventasMes)}
          icon={TrendingUp}
          hint={
            variacion !== null ? (
              <span className={variacion >= 0 ? "text-emerald-600" : "text-destructive"}>
                {variacion >= 0 ? (
                  <TrendingUp className="mr-1 inline h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 inline h-3 w-3" />
                )}
                {Math.abs(variacion).toFixed(1)}% vs. mes anterior
              </span>
            ) : (
              <span className="text-muted-foreground">Sin datos del mes anterior</span>
            )
          }
        />
        <KpiCard label="Ticket promedio" value={formatPEN(data.ticketPromedio)} icon={Receipt} />
        <KpiCard
          label="Transacciones hoy"
          value={`${data.transaccionesHoy}`}
          icon={Cake}
          hint={<span className="text-muted-foreground">ventas completadas</span>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tendencia de ventas (14 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.tendencia} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="piero" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E75480" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#E75480" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#FCE4EC" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatNumber(v as number, 0)}
                  />
                  <Tooltip formatter={(v) => formatPEN(Number(v))} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#E75480"
                    strokeWidth={2}
                    fill="url(#piero)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas por sucursal (mes)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.ventasPorSucursal.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin ventas este mes.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.ventasPorSucursal}
                    layout="vertical"
                    margin={{ left: 10, right: 10 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatPEN(Number(v))} />
                    <Bar dataKey="total" fill="#E75480" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos más vendidos (30 días)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topProductos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin ventas registradas.
              </p>
            ) : (
              data.topProductos.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-soft text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{formatPEN(p.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(p.cantidad)} unidades
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Alertas de stock bajo</CardTitle>
            <Badge variant={data.lowStock.length ? "destructive" : "soft"}>
              {data.lowStock.length} alerta{data.lowStock.length === 1 ? "" : "s"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Todo el stock está por encima del mínimo.
              </p>
            ) : (
              data.lowStock.slice(0, 8).map((s, i) => (
                <div
                  key={`${s.name}-${s.branch}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm"
                >
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    {s.name}
                    <span className="text-xs text-muted-foreground">({s.branch})</span>
                  </span>
                  <span className="font-medium text-destructive">
                    {formatNumber(s.quantity)} / {formatNumber(s.minimum)} {s.unit}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
