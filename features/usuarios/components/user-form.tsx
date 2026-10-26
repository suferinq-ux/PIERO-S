"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
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
import { cn } from "@/shared/lib/utils";
import { ROLES, ROLE_LABELS } from "@/shared/lib/constants";
import { ROLES_TUPLE } from "../schemas";
import type { UserWithBranches } from "../repository";
import type { Branch } from "@/shared/types/entities";
import type { Role } from "@/shared/types/entities";

const formSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido"),
  full_name: z.string().trim().min(2, "El nombre es obligatorio"),
  password: z.string().min(6, "Mínimo 6 caracteres").or(z.literal("")),
  role: z.enum(ROLES_TUPLE),
  is_active: z.boolean(),
  branch_ids: z.array(z.string()),
});

export type UserFormValues = z.infer<typeof formSchema>;

export function UserForm({
  open,
  onOpenChange,
  user,
  branches,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithBranches | null;
  branches: Branch[];
  onSubmit: (values: UserFormValues) => void;
  loading: boolean;
}) {
  const isEdit = !!user;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      role: "VENDEDOR_SOLO_LECTURA",
      is_active: true,
      branch_ids: [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        user
          ? {
              email: user.email,
              full_name: user.full_name ?? "",
              password: "",
              role: user.role,
              is_active: user.is_active,
              branch_ids: user.branch_ids,
            }
          : {
              email: "",
              full_name: "",
              password: "",
              role: "VENDEDOR_SOLO_LECTURA",
              is_active: true,
              branch_ids: [],
            },
      );
    }
  }, [open, user, form]);

  const branchIds = form.watch("branch_ids");

  function toggleBranch(id: string) {
    const current = branchIds ?? [];
    const next = current.includes(id) ? current.filter((b) => b !== id) : [...current, id];
    form.setValue("branch_ids", next, { shouldValidate: true });
  }

  const role = form.watch("role");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Actualiza el rol y las sucursales." : "Crea una cuenta y asigna permisos."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="user-form">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      disabled={isEdit}
                      placeholder="usuario@correo.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre y apellidos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((r: Role) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Usuario activo</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Desactívalo para bloquear el acceso.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-2">
              <Label>Sucursales asignadas</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {branches.map((branch) => {
                  const checked = (branchIds ?? []).includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                        checked ? "border-primary bg-soft" : "hover:bg-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={checked}
                        onChange={() => toggleBranch(branch.id)}
                      />
                      <span className="truncate">{branch.nombre}</span>
                    </label>
                  );
                })}
              </div>
              {role !== "SUPER_ADMIN" && (branchIds ?? []).length === 0 && (
                <p className="text-sm font-medium text-destructive">
                  Asigna al menos una sucursal para este rol.
                </p>
              )}
              {branches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay sucursales registradas. Crea una primero.
                </p>
              )}
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
