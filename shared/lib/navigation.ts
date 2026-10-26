import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingCart,
  Cake,
  Package,
  Factory,
  Truck,
  Tags,
  UserRound,
  ClipboardList,
  Receipt,
  BarChart3,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/shared/types/entities";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
}

/** Módulos implementados en la Fase 1. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/sucursales",
    label: "Sucursales",
    icon: Store,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL"],
  },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["SUPER_ADMIN"] },
];

/** Módulos de fases posteriores (se muestran como "próximamente"). */
export const UPCOMING_ITEMS: NavItem[] = [
  { href: "/pos", label: "Punto de venta", icon: ShoppingCart },
  { href: "/pedidos", label: "Pedidos", icon: Cake },
  { href: "/caja", label: "Caja", icon: Receipt },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/produccion", label: "Producción", icon: Factory },
  { href: "/transferencias", label: "Transferencias", icon: Truck },
  { href: "/catalogo", label: "Catálogo", icon: Tags },
  { href: "/clientes", label: "Clientes", icon: UserRound },
  { href: "/compras", label: "Compras", icon: ClipboardList },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/configuracion", label: "Configuración", icon: Settings },
  { href: "/auditoria", label: "Auditoría", icon: ScrollText },
];

/** Filtra los ítems según el rol del usuario (sin roles => visible para todos). */
export function filterNavByRole(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}
