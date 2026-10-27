"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ArrowRight, XCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatDateShort, formatPEN } from "@/shared/lib/format";
import { orderSchema, type OrderValues } from "../schemas";
import { orderRepository } from "../repository";
import { NEXT_STATUS, ORDER_STATUS_LABELS, type CustomOrder, type OrderStatus } from "../types";

const STATUS_VARIANT: Record<OrderStatus, "soft" | "secondary" | "default" | "outline"> = {
  PENDIENTE: "soft",
  EN_PRODUCCION: "secondary",
  LISTO: "default",
  ENTREGADO: "soft",
  CANCELADO: "outline",
};

export function PedidosManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [payOrder, setPayOrder] = useState<CustomOrder | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: orderRepository.list,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["order-branches"],
    queryFn: orderRepository.listBranches,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["order-customers"],
    queryFn: orderRepository.listCustomers,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["order-products"],
    queryFn: orderRepository.listProducts,
  });

  const form = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      branch_id: "",
      customer_id: "",
      product_id: "",
      fecha_entrega: "",
      hora_entrega: "",
      mensaje: "",
      sabor: "",
      relleno: "",
      tamano: "",
      cantidad: 1,
      total: 0,
      anticipo: 0,
      notas: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (v: OrderValues) =>
      orderRepository.create({
        branch_id: v.branch_id,
        customer_id: v.customer_id,
        product_id: v.product_id,
        fecha_entrega: v.fecha_entrega,
        hora_entrega: v.hora_entrega || null,
        mensaje: v.mensaje || null,
        sabor: v.sabor || null,
        relleno: v.relleno || null,
        tamano: v.tamano || null,
        cantidad: v.cantidad,
        total: v.total,
        anticipo: v.anticipo,
        notas: v.notas || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setOpen(false);
      form.reset();
      toast.success("Pedido registrado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderRepository.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Estado actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {orders?.length ?? 0} pedido{(orders?.length ?? 0) === 1 ? "" : "s"} por encargo
        </p>
        <Button
          onClick={() => {
            form.reset();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuevo pedido
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente / Producto</TableHead>
              <TableHead className="hidden sm:table-cell">Entrega</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="hidden sm:table-cell">Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((o) => {
              const next = NEXT_STATUS[o.status];
              const active = o.status !== "ENTREGADO" && o.status !== "CANCELADO";
              return (
                <TableRow key={o.id}>
                  <TableCell>
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.product_name} · {o.cantidad} un.
                      {o.mensaje ? ` · "${o.mensaje}"` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDateShort(o.fecha_entrega)}
                    {o.hora_entrega ? ` ${o.hora_entrega.slice(0, 5)}` : ""}
                  </TableCell>
                  <TableCell>{formatPEN(o.total)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={o.saldo > 0 ? "text-destructive" : "text-emerald-600"}>
                      {formatPEN(o.saldo)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[o.status]}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {active && o.saldo > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Abonar"
                          onClick={() => setPayOrder(o)}
                        >
                          <Wallet className="h-4 w-4" />
                        </Button>
                      )}
                      {next && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => advance.mutate({ id: o.id, status: next })}
                        >
                          <ArrowRight className="h-4 w-4" />
                          {ORDER_STATUS_LABELS[next]}
                        </Button>
                      )}
                      {active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Cancelar"
                          onClick={() => {
                            if (confirm("¿Cancelar este pedido?")) {
                              advance.mutate({ id: o.id, status: "CANCELADO" });
                            }
                          }}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {orders?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No hay pedidos por encargo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Crear pedido */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo pedido por encargo</DialogTitle>
            <DialogDescription>
              Tortas y pedidos especiales con entrega programada.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
              id="order-form"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="branch_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sucursal</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sucursal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producto base</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Producto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cantidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fecha_entrega"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de entrega</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hora_entrega"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de entrega</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sabor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sabor</FormLabel>
                      <FormControl>
                        <Input placeholder="Chocolate, vainilla…" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="relleno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relleno</FormLabel>
                      <FormControl>
                        <Input placeholder="Manjar, fresa…" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tamano"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamaño</FormLabel>
                      <FormControl>
                        <Input placeholder="Familiar, personal…" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total (S/)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="anticipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anticipo (S/)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mensaje"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje en la torta</FormLabel>
                      <FormControl>
                        <Input placeholder="¡Feliz cumpleaños!" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Indicaciones especiales" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="order-form" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : "Registrar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialog order={payOrder} onClose={() => setPayOrder(null)} />
    </div>
  );
}

function PaymentDialog({ order, onClose }: { order: CustomOrder | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("EFECTIVO");

  const add = useMutation({
    mutationFn: () => orderRepository.addPayment(order!.id, amount, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setAmount(0);
      onClose();
      toast.success("Abono registrado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>Saldo pendiente: {formatPEN(order?.saldo ?? 0)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Monto"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EFECTIVO">Efectivo</SelectItem>
              <SelectItem value="YAPE">Yape</SelectItem>
              <SelectItem value="PLIN">Plin</SelectItem>
              <SelectItem value="TARJETA">Tarjeta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => add.mutate()} disabled={add.isPending || amount <= 0}>
            Abonar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
