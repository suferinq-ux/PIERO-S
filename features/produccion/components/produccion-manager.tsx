"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Factory, CheckCircle2, XCircle } from "lucide-react";
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
import { productionRepository } from "../repository";
import type { ProductionStatus, RecipeOption } from "../types";

const STATUS_LABELS: Record<ProductionStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

const STATUS_VARIANT: Record<ProductionStatus, "soft" | "secondary" | "default" | "outline"> = {
  PENDIENTE: "soft",
  EN_PROCESO: "secondary",
  COMPLETADA: "default",
  CANCELADA: "outline",
};

export function ProduccionManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ["production-branches"],
    queryFn: productionRepository.listBranches,
  });
  const { data: recipes = [] } = useQuery({
    queryKey: ["production-recipes"],
    queryFn: productionRepository.listRecipes,
  });
  const { data: orders, isLoading } = useQuery({
    queryKey: ["production-orders"],
    queryFn: productionRepository.listOrders,
  });

  const create = useMutation({
    mutationFn: productionRepository.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      setOpen(false);
      toast.success("Orden de producción creada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const action = useMutation({
    mutationFn: async ({ type, id }: { type: "completar" | "cancelar"; id: string }) =>
      type === "completar" ? productionRepository.completar(id) : productionRepository.cancelar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
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
          {orders?.length ?? 0} orden{(orders?.length ?? 0) === 1 ? "" : "es"} de producción
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva orden
        </Button>
      </div>

      {!orders || orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Factory className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay órdenes de producción. Crea una para preparar productos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receta / Producto</TableHead>
                <TableHead className="hidden md:table-cell">Sucursal</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.product_name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {o.branch_name}
                  </TableCell>
                  <TableCell>{formatNumber(o.quantity)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {new Date(o.created_at).toLocaleDateString("es-PE")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {(o.status === "PENDIENTE" || o.status === "EN_PROCESO") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => action.mutate({ type: "completar", id: o.id })}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Completar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Cancelar"
                            onClick={() => action.mutate({ type: "cancelar", id: o.id })}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CreateOrderDialog
        open={open}
        onOpenChange={setOpen}
        branches={branches}
        recipes={recipes}
        onSubmit={create.mutate}
        loading={create.isPending}
      />
    </div>
  );
}

function CreateOrderDialog({
  open,
  onOpenChange,
  branches,
  recipes,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: string; nombre: string }[];
  recipes: RecipeOption[];
  onSubmit: (payload: {
    branch_id: string;
    recipe_id: string;
    product_id: string;
    variant_id: string | null;
    quantity: number;
    notas: string | null;
  }) => void;
  loading: boolean;
}) {
  const [branchId, setBranchId] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [notas, setNotas] = useState("");

  const recipe = recipes.find((r) => r.id === recipeId);

  const scaledItems = useMemo(() => {
    if (!recipe) return [];
    const scale = recipe.rendimiento > 0 ? quantity / recipe.rendimiento : 0;
    return recipe.items.map((i) => ({
      ...i,
      cantidad: i.cantidad * scale,
    }));
  }, [recipe, quantity]);

  function reset() {
    setBranchId("");
    setRecipeId("");
    setQuantity(0);
    setNotas("");
  }

  function handleSubmit() {
    if (!branchId || !recipe || quantity <= 0) {
      toast.error("Selecciona sucursal, receta y cantidad");
      return;
    }
    onSubmit({
      branch_id: branchId,
      recipe_id: recipe.id,
      product_id: recipe.product_id,
      variant_id: recipe.variant_id,
      quantity,
      notas: notas.trim() || null,
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nueva orden de producción</DialogTitle>
          <DialogDescription>
            Al completar la orden se descuentan insumos y se suma producto terminado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sucursal</Label>
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
            <div className="space-y-2">
              <Label>Receta</Label>
              <Select value={recipeId} onValueChange={setRecipeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Receta" />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre} — {r.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cantidad a producir</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={quantity || ""}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          {recipe && quantity > 0 && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="mb-2 text-sm font-medium">
                Insumos a consumir (rendimiento {recipe.rendimiento} {recipe.unidad_rendimiento}):
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {scaledItems.map((i) => (
                  <li key={i.supply_id}>
                    • {i.name}: {formatNumber(i.cantidad)} {i.unit}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
            {loading ? "Guardando…" : "Crear orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
