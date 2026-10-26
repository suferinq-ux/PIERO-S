import { z } from "zod";

export const branchSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  codigo: z.string().trim(),
  direccion: z.string().trim(),
  telefono: z.string().trim(),
  horario: z.string().trim(),
  serie_boleta: z.string().trim(),
  serie_factura: z.string().trim(),
});

export type BranchValues = z.infer<typeof branchSchema>;

/** Formulario vacío (crear). */
export const emptyBranch: BranchValues = {
  nombre: "",
  codigo: "",
  direccion: "",
  telefono: "",
  horario: "",
  serie_boleta: "",
  serie_factura: "",
};
