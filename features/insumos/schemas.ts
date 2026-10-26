import { z } from "zod";

export const supplySchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  unidad_medida: z.string().trim().min(1, "Indica la unidad (kg, litro, unidad…)"),
  costo: z.coerce.number().min(0, "El costo no puede ser negativo"),
  stock_minimo: z.coerce.number().min(0, "El stock mínimo no puede ser negativo"),
  is_active: z.boolean(),
});

export type SupplyValues = z.infer<typeof supplySchema>;
