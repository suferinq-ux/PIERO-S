import type { Metadata } from "next";
import { PedidosManager } from "@/features/pedidos/components/pedidos-manager";

export const metadata: Metadata = { title: "Pedidos" };

export default function PedidosPage() {
  return <PedidosManager />;
}
