import { createClient } from "@/lib/supabase/client";
import type { Branch, Customer, Product } from "@/shared/types/entities";
import type { CustomOrder, OrderOption, OrderPayment, OrderStatus } from "./types";

/** Repositorio de pedidos por encargo. */
export const orderRepository = {
  async listBranches(): Promise<Branch[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("branches").select("*").order("nombre");
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
  },

  async listCustomers(): Promise<OrderOption[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("id, nombre")
      .is("deleted_at", null)
      .order("nombre");
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderOption[];
  },

  async listProducts(): Promise<OrderOption[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, nombre")
      .is("deleted_at", null)
      .order("nombre");
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderOption[];
  },

  async list(): Promise<CustomOrder[]> {
    const supabase = createClient();
    const [ordersRes, customersRes, productsRes] = await Promise.all([
      supabase.from("orders_custom").select("*").order("fecha_entrega", { ascending: true }),
      supabase.from("customers").select("id, nombre"),
      supabase.from("products").select("id, nombre"),
    ]);
    const customerMap = new Map(
      ((customersRes.data ?? []) as Pick<Customer, "id" | "nombre">[]).map((c) => [c.id, c.nombre]),
    );
    const productMap = new Map(
      ((productsRes.data ?? []) as Pick<Product, "id" | "nombre">[]).map((p) => [p.id, p.nombre]),
    );
    return ((ordersRes.data ?? []) as CustomOrder[]).map((o) => ({
      ...o,
      customer_name: customerMap.get(o.customer_id) ?? "—",
      product_name: productMap.get(o.product_id) ?? "—",
    }));
  },

  async create(payload: {
    branch_id: string;
    customer_id: string;
    product_id: string;
    fecha_entrega: string;
    hora_entrega: string | null;
    mensaje: string | null;
    sabor: string | null;
    relleno: string | null;
    tamano: string | null;
    cantidad: number;
    total: number;
    anticipo: number;
    notas: string | null;
  }): Promise<void> {
    const supabase = createClient();
    const saldo = Math.max(0, payload.total - payload.anticipo);
    const { error } = await supabase.from("orders_custom").insert({
      ...payload,
      saldo,
      status: "PENDIENTE",
    });
    if (error) throw new Error(error.message);
  },

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("orders_custom").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listPayments(orderId: string): Promise<OrderPayment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("order_payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderPayment[];
  },

  async addPayment(orderId: string, amount: number, method: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("order_payments")
      .insert({ order_id: orderId, amount, method });
    if (error) throw new Error(error.message);

    const { data } = await supabase
      .from("orders_custom")
      .select("total, anticipo")
      .eq("id", orderId)
      .single();
    const order = data as { total: number; anticipo: number } | null;
    const anticipo = (order?.anticipo ?? 0) + amount;
    const saldo = Math.max(0, (order?.total ?? 0) - anticipo);
    await supabase.from("orders_custom").update({ anticipo, saldo }).eq("id", orderId);
  },
};
