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
  Wheat,
  ChefHat,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/shared/types/entities";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
}

/** Módulos implementados (Fases 1 y 2). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/sucursales",
    label: "Sucursales",
    icon: Store,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL"],
  },
  { href: "/catalogo", label: "Catálogo", icon: Tags, roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL"] },
  {
    href: "/insumos",
    label: "Insumos",
    icon: Wheat,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL", "PRODUCCION"],
  },
  {
    href: "/recetas",
    label: "Recetas",
    icon: ChefHat,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL", "PRODUCCION"],
  },
  {
    href: "/inventario",
    label: "Inventario",
    icon: Package,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL", "PRODUCCION"],
  },
  {
    href: "/transferencias",
    label: "Transferencias",
    icon: Truck,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL", "PRODUCCION"],
  },
  {
    href: "/produccion",
    label: "Producción",
    icon: Factory,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL", "PRODUCCION"],
  },
  {
    href: "/pos",
    label: "Punto de venta",
    icon: ShoppingCart,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL", "CAJERO"],
  },
  {
    href: "/caja",
    label: "Caja",
    icon: Receipt,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL", "CAJERO"],
  },
  {
    href: "/pedidos",
    label: "Pedidos",
    icon: Cake,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL", "CAJERO"],
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: UserRound,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL", "CAJERO"],
  },
  {
    href: "/compras",
    label: "Compras",
    icon: ClipboardList,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL"],
  },
  {
    href: "/gastos",
    label: "Gastos",
    icon: Receipt,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL"],
  },
  {
    href: "/reportes",
    label: "Reportes",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL"],
  },
  {
    href: "/auditoria",
    label: "Auditoría",
    icon: ScrollText,
    roles: ["SUPER_ADMIN", "ADMIN_SUCURSAL"],
  },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: Settings,
    roles: ["SUPER_ADMIN"],
  },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["SUPER_ADMIN"] },
];

/** Módulos de fases posteriores (se muestran como "próximamente"). */
export const UPCOMING_ITEMS: NavItem[] = [];

/** Filtra los ítems según el rol del usuario (sin roles => visible para todos). */
export function filterNavByRole(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}
