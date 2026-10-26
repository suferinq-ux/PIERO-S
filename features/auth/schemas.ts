import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const recoverSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido"),
});

export type RecoverValues = z.infer<typeof recoverSchema>;
