"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { branchRepository } from "../repository";
import { BranchForm } from "./branch-form";
import type { BranchValues } from "../schemas";
import type { Branch } from "@/shared/types/entities";

export function BranchesManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const {
    data: branches,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["branches"],
    queryFn: branchRepository.list,
  });

  const mutation = useMutation({
    mutationFn: async ({ branch, values }: { branch: Branch | null; values: BranchValues }) =>
      branch ? branchRepository.update(branch.id, values) : branchRepository.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
      setEditing(null);
      toast.success("Sucursal guardada correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: branchRepository.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Sucursal eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setOpen(true);
  }

  function handleSubmit(values: BranchValues) {
    mutation.mutate({ branch: editing, values });
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No se pudieron cargar las sucursales. Revisa tus permisos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {branches?.length ?? 0} sucursal{(branches?.length ?? 0) === 1 ? "" : "es"}
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nueva sucursal
        </Button>
      </div>

      {!branches || branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MapPin className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay sucursales. Crea la primera para empezar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="hidden md:table-cell">Dirección</TableHead>
                <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.nombre}</TableCell>
                  <TableCell className="uppercase text-muted-foreground">
                    {branch.codigo ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {branch.direccion ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {branch.telefono ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={branch.is_active ? "soft" : "outline"}>
                      {branch.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(branch)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar"
                        onClick={() => {
                          if (confirm(`¿Eliminar la sucursal "${branch.nombre}"?`)) {
                            remove.mutate(branch.id);
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
        </Card>
      )}

      <BranchForm
        open={open}
        onOpenChange={setOpen}
        branch={editing}
        onSubmit={handleSubmit}
        loading={mutation.isPending}
      />
    </div>
  );
}
