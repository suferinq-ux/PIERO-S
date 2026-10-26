import { z } from "zod";

export const categorySchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().trim(),
  is_active: z.boolean(),
});

export type CategoryValues = z.infer<typeof categorySchema>;

export const productSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  category_id: z.string().min(1, "Selecciona una categoría"),
  descripcion: z.string().trim(),
  barcode: z.string().trim(),
  image_url: z.string().trim(),
  has_variants: z.boolean(),
  is_active: z.boolean(),
});

export type ProductValues = z.infer<typeof productSchema>;
