import { z } from "zod";

export const ROLES_TUPLE = [
  "SUPER_ADMIN",
  "ADMIN_SUCURSAL",
  "CAJERO",
  "PRODUCCION",
  "VENDEDOR_SOLO_LECTURA",
] as const;

export const createUserSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido"),
  full_name: z.string().trim().min(2, "El nombre es obligatorio"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(ROLES_TUPLE),
  branch_ids: z.array(z.string()),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  full_name: z.string().trim().min(2, "El nombre es obligatorio"),
  role: z.enum(ROLES_TUPLE),
  is_active: z.boolean(),
  branch_ids: z.array(z.string()),
});

export type UpdateUserValues = z.infer<typeof updateUserSchema>;
