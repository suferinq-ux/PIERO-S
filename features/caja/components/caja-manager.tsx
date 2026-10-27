"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, LockKeyhole, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
import { formatPEN, formatTime } from "@/shared/lib/format";
import { cajaRepository } from "../repository";
import type { CashMovementType, CierreResult } from "../types";

export function CajaManager() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState("");
  const [abrirOpen, setAbrirOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [cierreOpen, setCierreOpen] = useState(false);
  const [montoInicial, setMontoInicial] = useState(0);
  const [movTipo, setMovTipo] = useState<CashMovementType>("INGRESO");
  const [movMonto, setMovMonto] = useState(0);
  const [movMotivo, setMovMotivo] = useState("");
  const [montoReal, setMontoReal] = useState(0);
  const [justificacion, setJustificacion] = useState("");
  const [cierreResult, setCierreResult] = useState<CierreResult | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ["caja-branches"],
    queryFn: cajaRepository.listBranches,
  });

  const activeBranchId = branchId || branches[0]?.id || "";

  const { data: register, isLoading } = useQuery({
    queryKey: ["caja-open", activeBranchId],
    queryFn: () => cajaRepository.listOpenRegister(activeBranchId),
    enabled: !!activeBranchId,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["caja-movements", register?.id],
    queryFn: () => cajaRepository.listMovements(register!.id),
    enabled: !!register,
  });

  const { ingresos, egresos, esperado } = useMemo(() => {
    const ing = movements.filter((m) => m.tipo === "INGRESO").reduce((a, m) => a + m.monto, 0);
    const egr = movements.filter((m) => m.tipo === "EGRESO").reduce((a, m) => a + m.monto, 0);
    return {
      ingresos: ing,
      egresos: egr,
      esperado: (register?.monto_inicial ?? 0) + ing - egr,
    };
  }, [movements, register]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["caja-open"] });
    queryClient.invalidateQueries({ queryKey: ["caja-movements"] });
    queryClient.invalidateQueries({ queryKey: ["pos-open-register"] });
  }

  const abrir = useMutation({
    mutationFn: () => cajaRepository.abrir(activeBranchId, montoInicial),
    onSuccess: () => {
      invalidate();
      setAbrirOpen(false);
      toast.success("Caja abierta");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const movimiento = useMutation({
    mutationFn: () =>
      cajaRepository.registrarMovimiento(register!.id, movTipo, movMonto, movMotivo.trim() || null),
    onSuccess: () => {
      invalidate();
      setMovOpen(false);
      setMovMonto(0);
      setMovMotivo("");
      toast.success("Movimiento registrado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cerrar = useMutation({
    mutationFn: () => cajaRepository.cerrar(register!.id, montoReal, justificacion.trim() || null),
    onSuccess: (result) => {
      invalidate();
      setCierreOpen(false);
      setCierreResult(result);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={activeBranchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Sucursal" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {register ? (
          <Badge variant="soft">Caja abierta</Badge>
        ) : (
          <Button onClick={() => setAbrirOpen(true)}>
            <Unlock className="h-4 w-4" /> Abrir caja
          </Button>
        )}
      </div>

      {!register ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay caja abierta para esta sucursal. Ábrela para registrar ventas y movimientos.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Monto inicial" value={formatPEN(register.monto_inicial)} />
            <SummaryCard label="Ingresos" value={formatPEN(ingresos)} tone="positive" />
            <SummaryCard label="Egresos" value={formatPEN(egresos)} tone="negative" />
            <SummaryCard label="Esperado en caja" value={formatPEN(esperado)} />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Movimientos de caja</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMovTipo("INGRESO");
                  setMovOpen(true);
                }}
              >
                <ArrowUpCircle className="h-4 w-4" /> Ingreso
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMovTipo("EGRESO");
                  setMovOpen(true);
                }}
              >
                <ArrowDownCircle className="h-4 w-4" /> Egreso
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setCierreOpen(true)}>
                <LockKeyhole className="h-4 w-4" /> Cerrar caja
              </Button>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">
                      {formatTime(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.tipo === "INGRESO" ? "soft" : "secondary"}>
                        {m.tipo === "INGRESO" ? "Ingreso" : "Egreso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.motivo ?? "—"}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${m.tipo === "INGRESO" ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {m.tipo === "INGRESO" ? "+" : "-"}
                      {formatPEN(m.monto)}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Sin movimientos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Abrir caja */}
      <Dialog open={abrirOpen} onOpenChange={setAbrirOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir caja</DialogTitle>
            <DialogDescription>Indica el monto inicial en efectivo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Monto inicial (S/)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={montoInicial || ""}
              onChange={(e) => setMontoInicial(Number(e.target.value) || 0)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbrirOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => abrir.mutate()} disabled={abrir.isPending}>
              {abrir.isPending ? "Abriendo…" : "Abrir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movimiento */}
      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movTipo === "INGRESO" ? "Registrar ingreso" : "Registrar egreso"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Monto (S/)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={movMonto || ""}
                onChange={(e) => setMovMonto(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={movMotivo}
                onChange={(e) => setMovMotivo(e.target.value)}
                placeholder="Motivo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (movMonto <= 0) return toast.error("Ingresa un monto válido");
                movimiento.mutate();
              }}
              disabled={movimiento.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cierre */}
      <Dialog open={cierreOpen} onOpenChange={setCierreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
            <DialogDescription>
              Esperado: {formatPEN(esperado)}. Indica el monto real contado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Monto real (S/)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={montoReal || ""}
                onChange={(e) => setMontoReal(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Justificación de diferencia (opcional)</Label>
              <Textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Explica la diferencia si existe"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCierreOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => cerrar.mutate()} disabled={cerrar.isPending}>
              {cerrar.isPending ? "Cerrando…" : "Cerrar caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resultado de cierre */}
      <Dialog open={!!cierreResult} onOpenChange={(v) => !v && setCierreResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arqueo de caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <Row label="Monto esperado" value={formatPEN(cierreResult?.esperado ?? 0)} />
            <Row label="Monto real" value={formatPEN(cierreResult?.real ?? 0)} />
            <div className="flex items-center justify-between border-t pt-2 font-semibold">
              <span>Diferencia</span>
              <span
                className={
                  cierreResult && cierreResult.diferencia !== 0
                    ? "text-destructive"
                    : "text-emerald-600"
                }
              >
                {formatPEN(cierreResult?.diferencia ?? 0)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCierreResult(null)}>Aceptar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`text-xl font-bold ${
            tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-destructive" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
