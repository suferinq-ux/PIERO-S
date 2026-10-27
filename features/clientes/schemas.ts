import { z } from "zod";

export const customerSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  telefono: z.string().trim(),
  email: z.string().trim().email("Correo inválido").or(z.literal("")),
  fecha_nacimiento: z.string().trim(),
  puntos: z.coerce.number().min(0, "Los puntos no pueden ser negativos"),
  notas: z.string().trim(),
});

export type CustomerValues = z.infer<typeof customerSchema>;

export const emptyCustomer: CustomerValues = {
  nombre: "",
  telefono: "",
  email: "",
  fecha_nacimiento: "",
  puntos: 0,
  notas: "",
};
