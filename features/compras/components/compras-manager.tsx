"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
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
import { formatPEN } from "@/shared/lib/format";
import { supplierSchema, emptySupplier, type SupplierValues } from "../schemas";
import { purchaseRepository } from "../repository";
import type { PurchaseStatus, SupplyOption } from "../types";
import type { Branch, Supplier } from "@/shared/types/entities";

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  BORRADOR: "Borrador",
  EMITIDA: "Emitida",
  RECIBIDA: "Recibida",
  CANCELADA: "Cancelada",
};

const STATUS_VARIANT: Record<PurchaseStatus, "soft" | "secondary" | "default" | "outline"> = {
  BORRADOR: "outline",
  EMITIDA: "secondary",
  RECIBIDA: "default",
  CANCELADA: "outline",
};

type Tab = "ordenes" | "proveedores";

export function ComprasManager() {
  const [tab, setTab] = useState<Tab>("ordenes");
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-muted p-1" role="tablist">
        {(
          [
            { id: "ordenes", label: "Órdenes de compra" },
            { id: "proveedores", label: "Proveedores" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ordenes" ? <OrdenesTab /> : <ProveedoresTab />}
    </div>
  );
}

function OrdenesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: purchaseRepository.listOrders,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: purchaseRepository.listSuppliers,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["purchase-branches"],
    queryFn: purchaseRepository.listBranches,
  });
  const { data: supplies = [] } = useQuery({
    queryKey: ["purchase-supplies"],
    queryFn: purchaseRepository.listSupplies,
  });

  const recibir = useMutation({
    mutationFn: purchaseRepository.recibir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      toast.success("Compra recibida e inventario actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelar = useMutation({
    mutationFn: purchaseRepository.cancelar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Orden cancelada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {orders?.length ?? 0} orden{(orders?.length ?? 0) === 1 ? "" : "es"}
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva orden
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead className="hidden md:table-cell">Sucursal</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.supplier_name}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {o.branch_name}
                </TableCell>
                <TableCell>{formatPEN(o.total)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {o.status === "EMITIDA" && (
                      <Button variant="outline" size="sm" onClick={() => recibir.mutate(o.id)}>
                        <CheckCircle2 className="h-4 w-4" /> Recibir
                      </Button>
                    )}
                    {(o.status === "EMITIDA" || o.status === "BORRADOR") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Cancelar"
                        onClick={() => cancelar.mutate(o.id)}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {orders?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No hay órdenes de compra.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOrderDialog
        open={open}
        onOpenChange={setOpen}
        suppliers={suppliers}
        branches={branches}
        supplies={supplies}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })}
      />
    </div>
  );
}

function CreateOrderDialog({
  open,
  onOpenChange,
  suppliers,
  branches,
  supplies,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  branches: Branch[];
  supplies: SupplyOption[];
  onCreated: () => void;
}) {
  const [branchId, setBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<
    { supply_id: string; cantidad: number; costo_unitario: number }[]
  >([]);

  const total = items.reduce((a, i) => a + i.cantidad * i.costo_unitario, 0);

  const create = useMutation({
    mutationFn: () =>
      purchaseRepository.createOrder({
        branch_id: branchId,
        supplier_id: supplierId,
        notas: notas.trim() || null,
        items: items.filter((i) => i.supply_id && i.cantidad > 0),
      }),
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
      setBranchId("");
      setSupplierId("");
      setNotas("");
      setItems([]);
      toast.success("Orden de compra creada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function addItem() {
    setItems((prev) => [...prev, { supply_id: "", cantidad: 0, costo_unitario: 0 }]);
  }

  function updateItem(index: number, patch: Partial<(typeof items)[number]>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva orden de compra</DialogTitle>
          <DialogDescription>Registra la compra de insumos a un proveedor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor</label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sucursal</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
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
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Insumos</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={item.supply_id}
                  onValueChange={(v) => {
                    const supply = supplies.find((s) => s.id === v);
                    updateItem(index, { supply_id: v, costo_unitario: supply?.costo ?? 0 });
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre} ({s.unidad_medida})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-24"
                  placeholder="Cant."
                  value={item.cantidad || ""}
                  onChange={(e) => updateItem(index, { cantidad: Number(e.target.value) || 0 })}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-28"
                  placeholder="Costo"
                  value={item.costo_unitario || ""}
                  onChange={(e) =>
                    updateItem(index, { costo_unitario: Number(e.target.value) || 0 })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setItems((prev) => prev.filter((_, x) => x !== index))}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Textarea
            placeholder="Notas opcionales"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 font-semibold">
            <span>Total</span>
            <span>{formatPEN(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Guardando…" : "Crear orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProveedoresTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: purchaseRepository.listSuppliers,
  });

  const form = useForm<SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: emptySupplier,
  });

  const mutation = useMutation({
    mutationFn: (values: SupplierValues) => purchaseRepository.saveSupplier(values, editing?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setOpen(false);
      setEditing(null);
      toast.success("Proveedor guardado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: purchaseRepository.removeSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    form.reset(emptySupplier);
    setOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    form.reset({
      nombre: supplier.nombre,
      ruc: supplier.ruc ?? "",
      telefono: supplier.telefono ?? "",
      email: supplier.email ?? "",
      direccion: supplier.direccion ?? "",
      is_active: supplier.is_active,
    });
    setOpen(true);
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {suppliers?.length ?? 0} proveedor{(suppliers?.length ?? 0) === 1 ? "" : "es"}
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo proveedor
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">RUC</TableHead>
              <TableHead className="hidden md:table-cell">Teléfono</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nombre}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {s.ruc ?? "—"}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {s.telefono ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar"
                      onClick={() => {
                        if (confirm(`¿Eliminar al proveedor "${s.nombre}"?`)) remove.mutate(s.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
              id="supplier-form"
            >
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Distribuidora…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ruc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUC</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Proveedor activo</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="supplier-form" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
