import { z } from "zod";

export const supplierSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  ruc: z.string().trim(),
  telefono: z.string().trim(),
  email: z.string().trim().email("Correo inválido").or(z.literal("")),
  direccion: z.string().trim(),
  is_active: z.boolean(),
});

export type SupplierValues = z.infer<typeof supplierSchema>;

export const emptySupplier: SupplierValues = {
  nombre: "",
  ruc: "",
  telefono: "",
  email: "",
  direccion: "",
  is_active: true,
};
