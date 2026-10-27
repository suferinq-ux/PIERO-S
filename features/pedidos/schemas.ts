import { z } from "zod";

export const orderSchema = z.object({
  branch_id: z.string().min(1, "Selecciona una sucursal"),
  customer_id: z.string().min(1, "Selecciona un cliente"),
  product_id: z.string().min(1, "Selecciona un producto"),
  fecha_entrega: z.string().min(1, "Indica la fecha de entrega"),
  hora_entrega: z.string(),
  mensaje: z.string().trim(),
  sabor: z.string().trim(),
  relleno: z.string().trim(),
  tamano: z.string().trim(),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  total: z.coerce.number().min(0, "El total no puede ser negativo"),
  anticipo: z.coerce.number().min(0, "El anticipo no puede ser negativo"),
  notas: z.string().trim(),
});

export type OrderValues = z.infer<typeof orderSchema>;
