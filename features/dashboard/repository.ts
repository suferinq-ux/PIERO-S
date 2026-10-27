import { createClient } from "@/lib/supabase/client";
import { format, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import type { Branch } from "@/shared/types/entities";

interface RawSale {
  id: string;
  branch_id: string;
  total: number;
  created_at: string;
}
interface RawSaleItem {
  sale_id: string;
  product_id: string;
  cantidad: number;
  subtotal: number;
}
interface RawSupply {
  id: string;
  nombre: string;
  unidad_medida: string;
  stock_minimo: number;
}
interface RawStock {
  branch_id: string;
  item_type: string;
  item_id: string;
  quantity: number;
}
interface RawProduct {
  id: string;
  nombre: string;
}

export interface LowStockAlert {
  name: string;
  quantity: number;
  minimum: number;
  unit: string;
  branch: string;
}

export interface DashboardData {
  ventasHoy: number;
  ventasMes: number;
  ventasMesAnterior: number;
  transaccionesHoy: number;
  ticketPromedio: number;
  ventasPorSucursal: { name: string; total: number }[];
  tendencia: { date: string; label: string; total: number }[];
  topProductos: { name: string; cantidad: number; total: number }[];
  lowStock: LowStockAlert[];
  branches: Branch[];
}

/** Repositorio del dashboard: trae datos de los últimos 30 días y agrega KPIs. */
export const dashboardRepository = {
  async get(): Promise<DashboardData> {
    const supabase = createClient();
    const now = new Date();
    const desde = subDays(startOfDay(now), 29);
    const inicioMes = startOfMonth(now);
    const inicioMesAnterior = startOfMonth(subMonths(now, 1));
    const inicioDia = startOfDay(now);

    const [branchesRes, salesRes, productsRes, suppliesRes, stockRes] = await Promise.all([
      supabase.from("branches").select("*").order("nombre"),
      supabase
        .from("sales")
        .select("*")
        .eq("status", "COMPLETADA")
        .gte("created_at", desde.toISOString()),
      supabase.from("products").select("id, nombre").is("deleted_at", null),
      supabase.from("supplies").select("*").is("deleted_at", null),
      supabase.from("stock_levels").select("*"),
    ]);

    const branches = (branchesRes.data ?? []) as Branch[];
    const sales = (salesRes.data ?? []) as RawSale[];
    const products = (productsRes.data ?? []) as RawProduct[];
    const supplies = (suppliesRes.data ?? []) as RawSupply[];
    const stock = (stockRes.data ?? []) as RawStock[];

    let items: RawSaleItem[] = [];
    if (sales.length > 0) {
      const { data } = await supabase
        .from("sale_items")
        .select("*")
        .in(
          "sale_id",
          sales.map((s) => s.id),
        );
      items = (data ?? []) as RawSaleItem[];
    }

    const sum = (list: RawSale[]) => list.reduce((a, s) => a + Number(s.total), 0);

    const hoySales = sales.filter((s) => new Date(s.created_at) >= inicioDia);
    const mesSales = sales.filter((s) => new Date(s.created_at) >= inicioMes);
    const mesAnteriorSales = sales.filter((s) => {
      const d = new Date(s.created_at);
      return d >= inicioMesAnterior && d < inicioMes;
    });

    const branchName = new Map(branches.map((b) => [b.id, b.nombre]));
    const productName = new Map(products.map((p) => [p.id, p.nombre]));
    const supplyMap = new Map(supplies.map((s) => [s.id, s]));

    // Ventas por sucursal (mes actual)
    const porSucursal = new Map<string, number>();
    for (const s of mesSales) {
      porSucursal.set(s.branch_id, (porSucursal.get(s.branch_id) ?? 0) + Number(s.total));
    }
    const ventasPorSucursal = Array.from(porSucursal.entries())
      .map(([id, total]) => ({ name: branchName.get(id) ?? "—", total }))
      .sort((a, b) => b.total - a.total);

    // Tendencia últimos 14 días
    const tendencia: DashboardData["tendencia"] = [];
    for (let i = 13; i >= 0; i--) {
      const day = subDays(startOfDay(now), i);
      const next = subDays(startOfDay(now), i - 1);
      const total = sales
        .filter((s) => {
          const d = new Date(s.created_at);
          return d >= day && d < next;
        })
        .reduce((a, s) => a + Number(s.total), 0);
      tendencia.push({
        date: format(day, "yyyy-MM-dd"),
        label: format(day, "dd/MM", { locale: es }),
        total,
      });
    }

    // Top productos
    const productAgg = new Map<string, { cantidad: number; total: number }>();
    for (const it of items) {
      const name = productName.get(it.product_id) ?? "—";
      const agg = productAgg.get(name) ?? { cantidad: 0, total: 0 };
      agg.cantidad += Number(it.cantidad);
      agg.total += Number(it.subtotal);
      productAgg.set(name, agg);
    }
    const topProductos = Array.from(productAgg.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Stock bajo (insumos)
    const lowStock: LowStockAlert[] = [];
    for (const st of stock) {
      if (st.item_type !== "INSUMO") continue;
      const supply = supplyMap.get(st.item_id);
      if (!supply) continue;
      if (Number(st.quantity) < Number(supply.stock_minimo)) {
        lowStock.push({
          name: supply.nombre,
          quantity: Number(st.quantity),
          minimum: Number(supply.stock_minimo),
          unit: supply.unidad_medida,
          branch: branchName.get(st.branch_id) ?? "—",
        });
      }
    }

    const mesSalesCount = mesSales.length;

    return {
      ventasHoy: sum(hoySales),
      ventasMes: sum(mesSales),
      ventasMesAnterior: sum(mesAnteriorSales),
      transaccionesHoy: hoySales.length,
      ticketPromedio: mesSalesCount ? sum(mesSales) / mesSalesCount : 0,
      ventasPorSucursal,
      tendencia,
      topProductos,
      lowStock,
      branches,
    };
  },
};
