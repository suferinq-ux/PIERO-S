import { z } from "zod";

export const recipeSchema = z.object({
  product_id: z.string().min(1, "Selecciona un producto"),
  variant_id: z.string(),
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  rendimiento: z.coerce.number().positive("El rendimiento debe ser mayor a 0"),
  unidad_rendimiento: z.string().trim().min(1, "Indica la unidad"),
  instrucciones: z.string().trim(),
});

export type RecipeValues = z.infer<typeof recipeSchema>;
