"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, History, PackageOpen, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";
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
import { formatNumber, formatRelative } from "@/shared/lib/format";
import { inventoryRepository } from "../repository";
import type { ItemOption, StockLine } from "../types";

const MOVEMENT_LABELS: Record<string, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
  MERMA: "Merma",
  TRANSFERENCIA: "Transferencia",
  PRODUCCION: "Producción",
  VENTA: "Venta",
  COMPRA: "Compra",
};

type TipoMovimiento = "entrada" | "salida" | "merma";

export function InventarioManager() {
  const queryClient = useQueryClient();

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["inventory-branches"],
    queryFn: inventoryRepository.listBranches,
  });
  const { data: stock = [], isLoading: loadingStock } = useQuery({
    queryKey: ["inventory-stock"],
    queryFn: inventoryRepository.listStock,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: inventoryRepository.listItems,
  });

  const [branchId, setBranchId] = useState<string>("");
  const activeBranchId = branchId || branches[0]?.id || "";

  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteItem, setAjusteItem] = useState<string>("");
  const [ajusteTipo, setAjusteTipo] = useState<TipoMovimiento>("entrada");
  const [ajusteCantidad, setAjusteCantidad] = useState<number>(0);
  const [ajusteMotivo, setAjusteMotivo] = useState("");

  const [kardex, setKardex] = useState<{ item: StockLine } | null>(null);

  const branchStock = useMemo(
    () => stock.filter((s) => s.branch_id === activeBranchId),
    [stock, activeBranchId],
  );

  const ajuste = useMutation({
    mutationFn: inventoryRepository.ajustarStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      setAjusteOpen(false);
      resetAjuste();
      toast.success("Stock actualizado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function resetAjuste() {
    setAjusteItem("");
    setAjusteTipo("entrada");
    setAjusteCantidad(0);
    setAjusteMotivo("");
  }

  const selectedItem: ItemOption | undefined = items.find((i) => i.id === ajusteItem);
  const currentStock = branchStock.find((s) => s.item_id === ajusteItem)?.quantity ?? 0;

  function submitAjuste() {
    if (!selectedItem || ajusteCantidad <= 0) {
      toast.error("Selecciona un insumo/producto y una cantidad válida");
      return;
    }
    if (ajusteTipo === "merma" && !ajusteMotivo.trim()) {
      toast.error("La merma requiere un motivo");
      return;
    }
    const sign = ajusteTipo === "entrada" ? 1 : -1;
    ajuste.mutate({
      branch_id: activeBranchId,
      item_type: selectedItem.item_type,
      item_id: selectedItem.id,
      quantity: sign * ajusteCantidad,
      movement_type: ajusteTipo === "merma" ? "MERMA" : "AJUSTE",
      motivo: ajusteMotivo.trim() || null,
    });
  }

  if (loadingBranches || loadingStock) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={activeBranchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Selecciona una sucursal" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            resetAjuste();
            setAjusteOpen(true);
          }}
        >
          <SlidersHorizontal className="h-4 w-4" /> Ajuste / Merma
        </Button>
      </div>

      {branchStock.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay stock registrado en esta sucursal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead className="hidden md:table-cell">Stock mínimo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchStock.map((line) => {
                const low = line.stock_minimo !== null && line.quantity < line.stock_minimo;
                return (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={line.item_type === "INSUMO" ? "soft" : "secondary"}>
                        {line.item_type === "INSUMO" ? "Insumo" : "Producto"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatNumber(line.quantity)} {line.unit}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {line.stock_minimo !== null
                        ? `${formatNumber(line.stock_minimo)} ${line.unit}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {low ? (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-4 w-4" /> Bajo
                        </span>
                      ) : (
                        <span className="text-muted-foreground">OK</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ver kardex"
                        onClick={() => setKardex({ item: line })}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Diálogo de ajuste / merma */}
      <Dialog open={ajusteOpen} onOpenChange={setAjusteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste de stock / Merma</DialogTitle>
            <DialogDescription>
              Registra una entrada, salida o merma de inventario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Insumo o producto</Label>
              <Select value={ajusteItem} onValueChange={setAjusteItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={`${item.item_type}-${item.id}`} value={item.id}>
                      {item.name} ({item.item_type === "INSUMO" ? "Insumo" : "Producto"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Stock actual: {formatNumber(currentStock)} {selectedItem.unit}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de movimiento</Label>
              <Select value={ajusteTipo} onValueChange={(v) => setAjusteTipo(v as TipoMovimiento)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (ajuste)</SelectItem>
                  <SelectItem value="salida">Salida (ajuste)</SelectItem>
                  <SelectItem value="merma">Merma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={ajusteCantidad || ""}
                onChange={(e) => setAjusteCantidad(Number(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Motivo {ajusteTipo === "merma" && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                value={ajusteMotivo}
                onChange={(e) => setAjusteMotivo(e.target.value)}
                placeholder={ajusteTipo === "merma" ? "Motivo de la merma" : "Motivo (opcional)"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAjusteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitAjuste} disabled={ajuste.isPending}>
              {ajuste.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de kardex */}
      <KardexDialog item={kardex?.item ?? null} onClose={() => setKardex(null)} />
    </div>
  );
}

function KardexDialog({ item, onClose }: { item: StockLine | null; onClose: () => void }) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ["movements", item?.branch_id, item?.item_type, item?.item_id],
    queryFn: () =>
      inventoryRepository.listMovements(item!.branch_id, item!.item_type, item!.item_id),
    enabled: !!item,
  });

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kardex — {item?.name}</DialogTitle>
          <DialogDescription>Historial de movimientos de este item.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Movimiento</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="hidden sm:table-cell">Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movements ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground">
                    {formatRelative(m.created_at)}
                  </TableCell>
                  <TableCell>{MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${m.quantity >= 0 ? "text-emerald-600" : "text-destructive"}`}
                  >
                    {m.quantity > 0 ? "+" : ""}
                    {formatNumber(m.quantity)} {item?.unit}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {m.motivo ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {(movements ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Sin movimientos registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
