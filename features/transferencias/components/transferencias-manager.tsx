"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck, Eye, Send, CheckCircle2, XCircle } from "lucide-react";
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
import { formatNumber } from "@/shared/lib/format";
import { inventoryRepository } from "@/features/inventario/repository";
import { transferRepository } from "../repository";
import type { Transfer, TransferItemInput, TransferStatus } from "../types";

const STATUS_LABELS: Record<TransferStatus, string> = {
  SOLICITADO: "Solicitado",
  ENVIADO: "Enviado",
  RECIBIDO: "Recibido",
  CANCELADO: "Cancelado",
};

const STATUS_VARIANT: Record<TransferStatus, "soft" | "secondary" | "default" | "outline"> = {
  SOLICITADO: "soft",
  ENVIADO: "secondary",
  RECIBIDO: "default",
  CANCELADO: "outline",
};

export function TransferenciasManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Transfer | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ["transfer-branches"],
    queryFn: transferRepository.listBranches,
  });
  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: transferRepository.list,
  });
  const { data: stock = [] } = useQuery({
    queryKey: ["inventory-stock"],
    queryFn: inventoryRepository.listStock,
  });

  const create = useMutation({
    mutationFn: transferRepository.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setOpen(false);
      toast.success("Transferencia solicitada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const action = useMutation({
    mutationFn: async ({ type, id }: { type: "enviar" | "recibir" | "cancelar"; id: string }) => {
      if (type === "enviar") return transferRepository.enviar(id);
      if (type === "recibir") return transferRepository.recibir(id);
      return transferRepository.cancelar(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      toast.success("Operación completada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {transfers?.length ?? 0} transferencia{(transfers?.length ?? 0) === 1 ? "" : "s"}
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva transferencia
        </Button>
      </div>

      {!transfers || transfers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Truck className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay transferencias. Crea una para mover stock entre sucursales.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origen → Destino</TableHead>
                <TableHead className="hidden sm:table-cell">Items</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.from_branch_name} → {t.to_branch_name}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {t.items.length} item{t.items.length === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {new Date(t.created_at).toLocaleDateString("es-PE")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ver detalle"
                        onClick={() => setDetail(t)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {t.status === "SOLICITADO" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Enviar"
                            onClick={() => action.mutate({ type: "enviar", id: t.id })}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Cancelar"
                            onClick={() => action.mutate({ type: "cancelar", id: t.id })}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {t.status === "ENVIADO" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => action.mutate({ type: "recibir", id: t.id })}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Recibir
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CreateTransferDialog
        open={open}
        onOpenChange={setOpen}
        branches={branches}
        stock={stock}
        onSubmit={create.mutate}
        loading={create.isPending}
      />

      <DetailDialog transfer={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function CreateTransferDialog({
  open,
  onOpenChange,
  branches,
  stock,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: string; nombre: string }[];
  stock: {
    item_type: "INSUMO" | "PRODUCTO";
    item_id: string;
    name: string;
    unit: string;
    quantity: number;
    branch_id: string;
  }[];
  onSubmit: (payload: {
    from_branch_id: string;
    to_branch_id: string;
    notas: string | null;
    items: TransferItemInput[];
  }) => void;
  loading: boolean;
}) {
  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<TransferItemInput[]>([]);

  const fromStock = useMemo(
    () => stock.filter((s) => s.branch_id === fromBranch && s.quantity > 0),
    [stock, fromBranch],
  );

  function reset() {
    setFromBranch("");
    setToBranch("");
    setNotas("");
    setItems([]);
  }

  function addItem() {
    setItems((prev) => [...prev, { item_type: "INSUMO", item_id: "", quantity: 0 }]);
  }

  function updateItem(index: number, patch: Partial<TransferItemInput>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!fromBranch || !toBranch || fromBranch === toBranch) {
      toast.error("Selecciona sucursales de origen y destino distintas");
      return;
    }
    const valid = items.filter((i) => i.item_id && i.quantity > 0);
    if (valid.length === 0) {
      toast.error("Agrega al menos un item con cantidad");
      return;
    }
    onSubmit({
      from_branch_id: fromBranch,
      to_branch_id: toBranch,
      notas: notas.trim() || null,
      items: valid,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva transferencia</DialogTitle>
          <DialogDescription>Solicita mover stock entre sucursales.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origen</Label>
              <Select value={fromBranch} onValueChange={setFromBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Sucursal origen" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Select value={toBranch} onValueChange={setToBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Sucursal destino" />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter((b) => b.id !== fromBranch)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items a transferir</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
            {fromStock.length === 0 && fromBranch && (
              <p className="text-sm text-muted-foreground">La sucursal de origen no tiene stock.</p>
            )}
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={item.item_id ? `${item.item_type}:${item.item_id}` : ""}
                  onValueChange={(v) => {
                    const [item_type, item_id] = v.split(":");
                    updateItem(index, {
                      item_type: item_type as TransferItemInput["item_type"],
                      item_id,
                    });
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona un item" />
                  </SelectTrigger>
                  <SelectContent>
                    {fromStock.map((s) => (
                      <SelectItem
                        key={`${s.item_type}:${s.item_id}`}
                        value={`${s.item_type}:${s.item_id}`}
                      >
                        {s.name} ({formatNumber(s.quantity)} {s.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-28"
                  placeholder="Cant."
                  value={item.quantity || ""}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar item"
                  onClick={() => removeItem(index)}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas opcionales"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando…" : "Solicitar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({ transfer, onClose }: { transfer: Transfer | null; onClose: () => void }) {
  return (
    <Dialog open={!!transfer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Transferencia</DialogTitle>
          <DialogDescription>
            {transfer?.from_branch_name} → {transfer?.to_branch_name}
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Recibido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfer?.items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell className="text-right">
                  {formatNumber(i.quantity)} {i.unit}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(i.received_quantity)} {i.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {transfer?.notas && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Notas:</span> {transfer.notas}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
