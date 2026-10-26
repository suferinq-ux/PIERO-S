"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
import { branchSchema, emptyBranch, type BranchValues } from "../schemas";
import type { Branch } from "@/shared/types/entities";

export function BranchForm({
  open,
  onOpenChange,
  branch,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
  onSubmit: (values: BranchValues) => void;
  loading: boolean;
}) {
  const form = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: emptyBranch,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        branch
          ? {
              nombre: branch.nombre,
              codigo: branch.codigo ?? "",
              direccion: branch.direccion ?? "",
              telefono: branch.telefono ?? "",
              horario: branch.horario ?? "",
              serie_boleta: branch.serie_boleta ?? "",
              serie_factura: branch.serie_factura ?? "",
            }
          : emptyBranch,
      );
    }
  }, [open, branch, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
          <DialogDescription>
            {branch
              ? "Actualiza los datos de la sucursal."
              : "Registra una nueva sucursal de PIERO'S."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
            id="branch-form"
          >
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="PIERO'S Centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="CENTRO" {...field} />
                  </FormControl>
                  <FormMessage />
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
                    <Input placeholder="066 312345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Jr. 9 de Diciembre 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="horario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horario</FormLabel>
                  <FormControl>
                    <Input placeholder="08:00 - 21:00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serie_boleta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serie boleta</FormLabel>
                    <FormControl>
                      <Input placeholder="B001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serie_factura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serie factura</FormLabel>
                    <FormControl>
                      <Input placeholder="F001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="branch-form" disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
