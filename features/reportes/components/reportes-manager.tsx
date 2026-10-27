"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import { Download, FileText, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatNumber, formatPEN } from "@/shared/lib/format";
import { reportRepository } from "../repository";
import { downloadCsv, downloadPdf } from "../export";

const todayStr = () => format(new Date(), "yyyy-MM-dd");
const monthStartStr = () => format(startOfMonth(new Date()), "yyyy-MM-dd");

export function ReportesManager() {
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());

  const { data: branches = [] } = useQuery({
    queryKey: ["report-branches"],
    queryFn: reportRepository.listBranches,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["report", branchId, from, to],
    queryFn: () => reportRepository.get({ branchId, from, to }),
    enabled: !!from && !!to,
  });

  const branchLabel = branches.find((b) => b.id === branchId)?.nombre ?? "Todas las sucursales";

  async function exportPdf() {
    if (!data) return;
    try {
      await downloadPdf(
        `reporte-pieros-${from}-${to}.pdf`,
        "PIERO'S — Reporte",
        `${branchLabel} · ${from} al ${to}`,
        [
          {
            title: "Resumen",
            headers: ["Indicador", "Valor"],
            rows: [
              ["Ventas totales", formatPEN(data.ventasTotal)],
              ["Transacciones", data.transacciones],
              ["Ticket promedio", formatPEN(data.ticketPromedio)],
              ["Utilidad estimada", formatPEN(data.utilidadEstimada)],
              ["Inventario valorizado", formatPEN(data.inventarioTotal)],
            ],
          },
          {
            title: "Ventas por producto",
            headers: ["Producto", "Cantidad", "Total"],
            rows: data.porProducto.map((p) => [
              p.name,
              formatNumber(p.cantidad),
              formatPEN(p.total),
            ]),
          },
          {
            title: "Ventas por cajero",
            headers: ["Cajero", "Transacciones", "Total"],
            rows: data.porCajero.map((c) => [c.name, c.count, formatPEN(c.total)]),
          },
          {
            title: "Ventas por sucursal",
            headers: ["Sucursal", "Total"],
            rows: data.porSucursal.map((s) => [s.name, formatPEN(s.total)]),
          },
          {
            title: "Inventario valorizado",
            headers: ["Item", "Cantidad", "Costo unit.", "Valor"],
            rows: data.inventario.map((i) => [
              i.name,
              `${formatNumber(i.quantity)} ${i.unit}`,
              formatPEN(i.cost),
              formatPEN(i.value),
            ]),
          },
        ],
      );
      toast.success("PDF generado");
    } catch {
      toast.error("No se pudo generar el PDF");
    }
  }

  function exportExcel() {
    if (!data) return;
    downloadCsv(
      `reporte-ventas-producto-${from}-${to}.csv`,
      ["Producto", "Cantidad", "Total"],
      data.porProducto.map((p) => [p.name, p.cantidad, p.total]),
    );
    toast.success("Excel generado");
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Sucursal</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las sucursales</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={exportExcel} disabled={!data}>
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button onClick={exportPdf} disabled={!data}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Ventas totales" value={formatPEN(data.ventasTotal)} />
            <Metric label="Transacciones" value={`${data.transacciones}`} />
            <Metric label="Ticket promedio" value={formatPEN(data.ticketPromedio)} />
            <Metric label="Utilidad estimada" value={formatPEN(data.utilidadEstimada)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportTable
              title="Ventas por día"
              headers={["Día", "Total"]}
              rows={data.porDia.map((d) => [d.label, formatPEN(d.total)])}
              empty="Sin ventas en el período."
            />
            <ReportTable
              title="Ventas por sucursal"
              headers={["Sucursal", "Total"]}
              rows={data.porSucursal.map((s) => [s.name, formatPEN(s.total)])}
              empty="Sin ventas en el período."
            />
            <ReportTable
              title="Ventas por producto"
              headers={["Producto", "Cantidad", "Total"]}
              rows={data.porProducto.map((p) => [
                p.name,
                formatNumber(p.cantidad),
                formatPEN(p.total),
              ])}
              empty="Sin ventas en el período."
            />
            <ReportTable
              title="Ventas por cajero"
              headers={["Cajero", "Transacciones", "Total"]}
              rows={data.porCajero.map((c) => [c.name, `${c.count}`, formatPEN(c.total)])}
              empty="Sin ventas en el período."
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Inventario valorizado</CardTitle>
              <Badge variant="soft">{formatPEN(data.inventarioTotal)}</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead className="text-right">Costo unit.</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.inventario.map((i, idx) => (
                    <TableRow key={`${i.name}-${idx}`}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell>
                        {formatNumber(i.quantity)} {i.unit}
                      </TableCell>
                      <TableCell className="text-right">{formatPEN(i.cost)}</TableCell>
                      <TableCell className="text-right">{formatPEN(i.value)}</TableCell>
                    </TableRow>
                  ))}
                  {data.inventario.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Sin stock registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReportTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h} className={h === headers[0] ? "" : "text-right"}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                {r.map((cell, j) => (
                  <TableCell key={j} className={j === 0 ? "font-medium" : "text-right"}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={headers.length}
                  className="py-6 text-center text-muted-foreground"
                >
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
