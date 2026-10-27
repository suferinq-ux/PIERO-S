import { z } from "zod";

export interface Expense {
  id: string;
  branch_id: string;
  categoria: string;
  monto: number;
  descripcion: string | null;
  fecha: string;
  created_at: string;
  branch_name: string;
}

export const GASTO_CATEGORIAS = ["Alquiler", "Servicios", "Sueldos", "Otros"] as const;

export const expenseSchema = z.object({
  branch_id: z.string().min(1, "Selecciona una sucursal"),
  categoria: z.string().min(1, "Selecciona una categoría"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  descripcion: z.string().trim(),
  fecha: z.string().min(1, "Indica la fecha"),
});

export type ExpenseValues = z.infer<typeof expenseSchema>;
