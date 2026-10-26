import type { Role } from "@/shared/types/entities";

export const ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN_SUCURSAL",
  "CAJERO",
  "PRODUCCION",
  "VENDEDOR_SOLO_LECTURA",
];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_SUCURSAL: "Administrador de sucursal",
  CAJERO: "Cajero",
  PRODUCCION: "Producción",
  VENDEDOR_SOLO_LECTURA: "Vendedor (solo lectura)",
};

/** Roles que pueden escribir en el catálogo y configuración de sucursal. */
export const ROLES_CATALOGO: Role[] = ["SUPER_ADMIN", "ADMIN_SUCURSAL"];
