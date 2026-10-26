"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ROLE_LABELS } from "@/shared/lib/constants";
import { userRepository, type UserWithBranches } from "../repository";
import { UserForm, type UserFormValues } from "./user-form";

export function UsersManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserWithBranches | null>(null);

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: userRepository.list,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: userRepository.listBranches,
  });

  const mutation = useMutation({
    mutationFn: async ({
      user,
      values,
    }: {
      user: UserWithBranches | null;
      values: UserFormValues;
    }) => {
      if (user) {
        return userRepository.update(user.id, {
          full_name: values.full_name,
          role: values.role,
          is_active: values.is_active,
          branch_ids: values.branch_ids,
        });
      }
      return userRepository.create({
        email: values.email,
        full_name: values.full_name,
        password: values.password,
        role: values.role,
        branch_ids: values.branch_ids,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setEditing(null);
      toast.success("Usuario guardado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(values: UserFormValues) {
    mutation.mutate({ user: editing, values });
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Solo un SUPER_ADMIN puede gestionar usuarios.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {users?.length ?? 0} usuario{(users?.length ?? 0) === 1 ? "" : "s"}
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      {!users || users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UserRound className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay usuarios. Crea el primero para gestionar el negocio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="hidden sm:table-cell">Sucursales</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "SUPER_ADMIN" ? "default" : "soft"}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {user.branch_ids.length} sucursal{user.branch_ids.length === 1 ? "" : "es"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "soft" : "outline"}>
                      {user.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar usuario"
                      onClick={() => {
                        setEditing(user);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <UserForm
        open={open}
        onOpenChange={setOpen}
        user={editing}
        branches={branches}
        onSubmit={handleSubmit}
        loading={mutation.isPending}
      />
    </div>
  );
}
