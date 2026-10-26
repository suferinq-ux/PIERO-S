"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatPEN } from "@/shared/lib/format";
import { supplySchema, type SupplyValues } from "../schemas";
import { supplyRepository } from "../repository";
import type { Supply } from "@/shared/types/entities";

export function InsumosManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supply | null>(null);

  const { data: supplies, isLoading } = useQuery({
    queryKey: ["supplies"],
    queryFn: supplyRepository.list,
  });

  const form = useForm<SupplyValues>({
    resolver: zodResolver(supplySchema),
    defaultValues: { nombre: "", unidad_medida: "", costo: 0, stock_minimo: 0, is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (values: SupplyValues) => supplyRepository.save(values, editing?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      setOpen(false);
      setEditing(null);
      toast.success("Insumo guardado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: supplyRepository.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      toast.success("Insumo eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    form.reset({ nombre: "", unidad_medida: "", costo: 0, stock_minimo: 0, is_active: true });
    setOpen(true);
  }

  function openEdit(supply: Supply) {
    setEditing(supply);
    form.reset({
      nombre: supply.nombre,
      unidad_medida: supply.unidad_medida,
      costo: supply.costo,
      stock_minimo: supply.stock_minimo,
      is_active: supply.is_active,
    });
    setOpen(true);
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {supplies?.length ?? 0} insumo{(supplies?.length ?? 0) === 1 ? "" : "s"}
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuevo insumo
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead className="hidden sm:table-cell">Stock mínimo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplies?.map((supply) => (
              <TableRow key={supply.id}>
                <TableCell className="font-medium">{supply.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{supply.unidad_medida}</TableCell>
                <TableCell>{formatPEN(supply.costo)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {supply.stock_minimo} {supply.unidad_medida}
                </TableCell>
                <TableCell>
                  <Badge variant={supply.is_active ? "soft" : "outline"}>
                    {supply.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(supply)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar"
                      onClick={() => {
                        if (confirm(`¿Eliminar el insumo "${supply.nombre}"?`)) {
                          remove.mutate(supply.id);
                        }
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
            <DialogTitle>{editing ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
            <DialogDescription>
              {editing ? "Actualiza el insumo." : "Registra una materia prima."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
              id="supply-form"
            >
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Harina, Queso fresco…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unidad_medida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad de medida</FormLabel>
                      <FormControl>
                        <Input placeholder="kg, litro, unidad" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo unitario (S/)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="stock_minimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock mínimo</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Insumo activo</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="supply-form" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
