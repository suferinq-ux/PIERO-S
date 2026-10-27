import { createClient } from "@/lib/supabase/client";
import type { Branch, Product, Supply } from "@/shared/types/entities";
import type { CreateTransferPayload, Transfer, TransferItem } from "./types";

/** Repositorio de transferencias. Los cambios de estado van por RPC. */
export const transferRepository = {
  async listBranches(): Promise<Branch[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
  },

  async list(): Promise<Transfer[]> {
    const supabase = createClient();
    const [transfersRes, itemsRes, branchesRes, suppliesRes, productsRes] = await Promise.all([
      supabase.from("transfers").select("*").order("created_at", { ascending: false }),
      supabase.from("transfer_items").select("*"),
      supabase.from("branches").select("*"),
      supabase.from("supplies").select("*").is("deleted_at", null),
      supabase.from("products").select("*").is("deleted_at", null),
    ]);

    const branches = (branchesRes.data ?? []) as Branch[];
    const supplies = (suppliesRes.data ?? []) as Supply[];
    const products = (productsRes.data ?? []) as Product[];

    const branchMap = new Map(branches.map((b) => [b.id, b]));
    const supplyMap = new Map(supplies.map((s) => [s.id, s]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    const rawItems = (itemsRes.data ?? []) as TransferItem[];

    return ((transfersRes.data ?? []) as Transfer[]).map((t) => ({
      ...t,
      from_branch_name: branchMap.get(t.from_branch_id)?.nombre ?? "—",
      to_branch_name: branchMap.get(t.to_branch_id)?.nombre ?? "—",
      items: rawItems
        .filter((i) => i.transfer_id === t.id)
        .map((i) => {
          const supply = i.item_type === "INSUMO" ? supplyMap.get(i.item_id) : null;
          const product = i.item_type === "PRODUCTO" ? productMap.get(i.item_id) : null;
          return {
            ...i,
            name: supply?.nombre ?? product?.nombre ?? "—",
            unit: supply?.unidad_medida ?? "unidad",
          } as TransferItem;
        }),
    }));
  },

  async create(payload: CreateTransferPayload): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transfers")
      .insert({
        from_branch_id: payload.from_branch_id,
        to_branch_id: payload.to_branch_id,
        notas: payload.notas,
        status: "SOLICITADO",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const transferId = (data as Transfer).id;

    const { error: itemsError } = await supabase.from("transfer_items").insert(
      payload.items.map((i) => ({
        transfer_id: transferId,
        item_type: i.item_type,
        item_id: i.item_id,
        quantity: i.quantity,
        received_quantity: 0,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);
    return transferId;
  },

  async enviar(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("enviar_transferencia", { p_transfer_id: id });
    if (error) throw new Error(error.message);
  },

  async recibir(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("recibir_transferencia", { p_transfer_id: id });
    if (error) throw new Error(error.message);
  },

  async cancelar(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("cancelar_transferencia", { p_transfer_id: id });
    if (error) throw new Error(error.message);
  },
};
