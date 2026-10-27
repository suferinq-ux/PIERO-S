"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShoppingCart, Plus, Minus, Printer, Ban, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { formatPEN, formatTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { roundMoney, calcChange } from "@/domain/pricing";
import { catalogRepository } from "@/features/catalogo/repository";
import { ventaRepository } from "@/features/ventas/repository";
import { customerRepository } from "@/features/clientes/repository";
import type {
  CartItem,
  ConsumptionType,
  PaymentInput,
  PaymentMethod,
  SaleResult,
} from "@/features/ventas/types";
import type { Customer, Role } from "@/shared/types/entities";
import type { ProductWithDetails } from "@/features/catalogo/types";
import type { RegistrarVentaInput } from "@/features/ventas/repository";
import { useOfflineQueue } from "@/lib/offline/use-offline-queue";
import { enqueueSale } from "@/lib/offline/db";
import { isNetworkError } from "@/lib/offline/sync";

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "EFECTIVO", label: "Efectivo" },
  { id: "YAPE", label: "Yape" },
  { id: "PLIN", label: "Plin" },
  { id: "TARJETA", label: "Tarjeta" },
];

interface LastSale {
  result: SaleResult;
  items: CartItem[];
  payments: PaymentInput[];
  change: number;
}

export function PosClient({ role }: { role: Role }) {
  const canDiscount = role === "SUPER_ADMIN" || role === "ADMIN_SUCURSAL";
  const { pending, syncing, flush, refresh } = useOfflineQueue();

  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [variantPicker, setVariantPicker] = useState<ProductWithDetails | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [tab, setTab] = useState<"vender" | "ventas">("vender");

  const { data: branches = [] } = useQuery({
    queryKey: ["pos-branches"],
    queryFn: catalogRepository.listBranches,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["pos-categories"],
    queryFn: catalogRepository.listCategories,
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["pos-products"],
    queryFn: catalogRepository.listProducts,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["pos-customers"],
    queryFn: customerRepository.list,
  });

  const activeBranchId = branchId || branches[0]?.id || "";

  const { data: openRegister } = useQuery({
    queryKey: ["pos-open-register", activeBranchId],
    queryFn: () => ventaRepository.listOpenRegister(activeBranchId),
    enabled: !!activeBranchId,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = !categoryId || p.category_id === categoryId;
      const matchSearch =
        !q || p.nombre.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q);
      return matchCat && matchSearch && p.is_active;
    });
  }, [products, search, categoryId]);

  const subtotal = roundMoney(cart.reduce((acc, i) => acc + i.price * i.quantity, 0));

  function getPrice(product: ProductWithDetails, variantId: string | null): number | null {
    const p = product.prices.find(
      (x) => x.branch_id === activeBranchId && (x.variant_id ?? null) === (variantId ?? null),
    );
    return p ? p.price : null;
  }

  function addToCart(
    product: ProductWithDetails,
    variantId: string | null,
    variantName: string | null,
  ) {
    const price = getPrice(product, variantId);
    if (price === null) {
      toast.error("No hay precio configurado para este producto en la sucursal");
      return;
    }
    const key = `${product.id}:${variantId ?? "base"}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          variant_id: variantId,
          name: product.nombre,
          variant_name: variantName,
          price,
          quantity: 1,
        },
      ];
    });
  }

  function handleProductClick(product: ProductWithDetails) {
    if (product.has_variants && product.variants.length > 0) {
      setVariantPicker(product);
    } else {
      addToCart(product, null, null);
    }
  }

  function changeQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  if (isLoading) return <Skeleton className="h-[60vh] w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted p-1">
            <button
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                tab === "vender" ? "bg-background text-primary shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setTab("vender")}
            >
              Vender
            </button>
            <button
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                tab === "ventas" ? "bg-background text-primary shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setTab("ventas")}
            >
              Ventas
            </button>
          </div>
          <Select value={activeBranchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <Button variant="outline" size="sm" onClick={() => flush()} disabled={syncing}>
              {syncing ? "Sincronizando…" : `${pending} pendiente${pending === 1 ? "" : "s"}`}
            </Button>
          )}
          {tab === "vender" && (
            <Badge variant={openRegister ? "soft" : "destructive"}>
              {openRegister ? "Caja abierta" : "Sin caja abierta"}
            </Badge>
          )}
        </div>
      </div>

      {tab === "ventas" ? (
        <SalesHistory branchId={activeBranchId} role={role} />
      ) : (
        <>
          {/* Búsqueda y categorías */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre o código de barras…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                  !categoryId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
                onClick={() => setCategoryId("")}
              >
                Todos
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                    categoryId === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de productos */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => {
              const price = getPrice(product, null);
              return (
                <button
                  key={product.id}
                  data-testid="pos-product"
                  onClick={() => handleProductClick(product)}
                  className="flex flex-col rounded-xl border bg-card p-3 text-left shadow-card transition-colors hover:border-primary"
                >
                  <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-soft">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl">🍰</span>
                    )}
                  </div>
                  <span className="line-clamp-2 text-sm font-medium leading-tight">
                    {product.nombre}
                  </span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-semibold text-primary">
                      {price !== null ? formatPEN(price) : "—"}
                    </span>
                    {product.has_variants && (
                      <Badge variant="secondary" className="text-[10px]">
                        Variantes
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                No hay productos que coincidan.
              </p>
            )}
          </div>
        </>
      )}

      {/* Botón flotante del carrito */}
      {cart.length > 0 && tab === "vender" && (
        <button
          data-testid="pos-cart"
          onClick={() => setCheckoutOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg"
        >
          <ShoppingCart className="h-5 w-5" />
          {cart.reduce((a, i) => a + i.quantity, 0)} · {formatPEN(subtotal)}
        </button>
      )}

      {/* Selector de variante */}
      <Dialog open={!!variantPicker} onOpenChange={(v) => !v && setVariantPicker(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{variantPicker?.nombre}</DialogTitle>
            <DialogDescription>Elige una variante</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {variantPicker?.variants.map((v) => {
              const price = getPrice(variantPicker, v.id);
              return (
                <Button
                  key={v.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    addToCart(variantPicker, v.id, v.nombre);
                    setVariantPicker(null);
                  }}
                >
                  <span>{v.nombre}</span>
                  <span className="font-semibold">{price !== null ? formatPEN(price) : "—"}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        branchId={activeBranchId}
        cart={cart}
        subtotal={subtotal}
        canDiscount={canDiscount}
        customers={customers}
        onChangeQty={changeQty}
        onPaid={(sale, items, payments, change) => {
          setCart([]);
          setLastSale({ result: sale, items, payments, change });
          setCheckoutOpen(false);
        }}
        onOffline={async (payload) => {
          await enqueueSale(payload);
          await refresh();
          setCart([]);
          setCheckoutOpen(false);
          toast.success("Sin conexión: venta guardada y se sincronizará automáticamente");
        }}
      />

      {/* Recibo */}
      <ReceiptDialog sale={lastSale} onClose={() => setLastSale(null)} />
    </div>
  );
}

function CheckoutDialog({
  open,
  onOpenChange,
  branchId,
  cart,
  subtotal,
  canDiscount,
  customers,
  onChangeQty,
  onPaid,
  onOffline,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  cart: CartItem[];
  subtotal: number;
  canDiscount: boolean;
  customers: Customer[];
  onChangeQty: (key: string, delta: number) => void;
  onPaid: (sale: SaleResult, items: CartItem[], payments: PaymentInput[], change: number) => void;
  onOffline: (payload: RegistrarVentaInput) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [descuento, setDescuento] = useState(0);
  const [tipoConsumo, setTipoConsumo] = useState<ConsumptionType>("LOCAL");
  const [payments, setPayments] = useState<PaymentInput[]>([]);
  const [recibido, setRecibido] = useState<number>(0);
  const [customerId, setCustomerId] = useState("");

  const total = roundMoney(Math.max(0, subtotal - descuento));
  const paid = roundMoney(payments.reduce((a, p) => a + p.amount, 0));
  const remaining = roundMoney(total - paid);
  const isExact = Math.abs(remaining) <= 0.01;

  const isSingleEfectivo = payments.length === 1 && payments[0].method === "EFECTIVO";
  const change = isSingleEfectivo ? calcChange(recibido || total, total) : 0;

  const registrar = useMutation({
    mutationFn: ventaRepository.registrar,
    onSuccess: (sale) => {
      const changeToApply = isSingleEfectivo ? change : 0;
      if (customerId) {
        const points = Math.floor(total / 10);
        customerRepository
          .addPoints(customerId, points)
          .then(() => queryClient.invalidateQueries({ queryKey: ["pos-customers"] }))
          .catch(() => undefined);
      }
      onPaid(sale, cart, payments, changeToApply);
    },
    onError: (err: Error, variables) => {
      if (isNetworkError(err)) {
        void onOffline(variables);
      } else {
        toast.error(err.message);
      }
    },
  });

  function quickPay(method: PaymentMethod) {
    setPayments([{ method, amount: total, referencia: null }]);
    setRecibido(total);
  }

  function updatePayment(index: number, patch: Partial<PaymentInput>) {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function cobrar() {
    if (!isExact) {
      toast.error("El total pagado no coincide con el total");
      return;
    }
    registrar.mutate({
      branch_id: branchId,
      items: cart.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        cantidad: i.quantity,
      })),
      payments,
      descuento,
      tipo_consumo: tipoConsumo,
      customer_id: customerId || null,
      notas: null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resumen de venta</DialogTitle>
          <DialogDescription>Revisa el carrito y el pago.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Items */}
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.variant_name ? `${item.variant_name} · ` : ""}
                    {formatPEN(item.price)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onChangeQty(item.key, -1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-5 text-center">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onChangeQty(item.key, 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="w-16 text-right font-medium">
                  {formatPEN(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="space-y-2 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPEN(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Descuento (S/)</span>
              {canDiscount ? (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8 w-24 text-right"
                  value={descuento || ""}
                  onChange={(e) => setDescuento(Number(e.target.value) || 0)}
                />
              ) : (
                <span>0.00</span>
              )}
            </div>
            {!canDiscount && (
              <p className="text-xs text-muted-foreground">
                Los descuentos requieren un administrador.
              </p>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPEN(total)}</span>
            </div>
          </div>

          {/* Tipo de consumo */}
          <div className="space-y-1">
            <Label>Consumo</Label>
            <Select value={tipoConsumo} onValueChange={(v) => setTipoConsumo(v as ConsumptionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOCAL">En local</SelectItem>
                <SelectItem value="PARA_LLEVAR">Para llevar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cliente (opcional) */}
          <div className="space-y-1">
            <Label>Cliente (opcional)</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin cliente</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pago */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label>Método de pago</Label>
              <span
                className={cn(
                  "text-sm font-medium",
                  isExact ? "text-emerald-600" : "text-destructive",
                )}
              >
                {isExact ? "Completado" : `Falta ${formatPEN(remaining)}`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={payments.some((p) => p.method === m.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => quickPay(m.id)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
            {payments.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-20 text-sm text-muted-foreground">
                  {PAYMENT_METHODS.find((m) => m.id === p.method)?.label}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8 flex-1 text-right"
                  value={p.amount || ""}
                  onChange={(e) => updatePayment(i, { amount: Number(e.target.value) || 0 })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPayments((prev) => prev.filter((_, x) => x !== i))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {isSingleEfectivo && (
              <div className="flex items-center gap-2">
                <span className="w-20 text-sm text-muted-foreground">Recibido</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8 flex-1 text-right"
                  value={recibido || ""}
                  onChange={(e) => setRecibido(Number(e.target.value) || 0)}
                />
                <span className="w-20 text-right text-sm font-medium">
                  Vuelto: {formatPEN(change)}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            data-testid="pos-cobrar"
            onClick={cobrar}
            disabled={!isExact || registrar.isPending || cart.length === 0}
          >
            {registrar.isPending ? "Cobrando…" : `Cobrar ${formatPEN(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SalesHistory({ branchId, role }: { branchId: string; role: Role }) {
  const queryClient = useQueryClient();
  const { data: sales, isLoading } = useQuery({
    queryKey: ["pos-sales", branchId],
    queryFn: () => ventaRepository.listSales(branchId),
    enabled: !!branchId,
  });

  const anular = useMutation({
    mutationFn: ventaRepository.anular,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      toast.success("Venta anulada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canAnular = role === "SUPER_ADMIN" || role === "ADMIN_SUCURSAL";

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="rounded-xl border bg-card">
      <div className="divide-y">
        {sales?.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 p-3">
            <div>
              <p className="font-medium">
                {s.serie}-{s.numero}{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {formatTime(s.created_at)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {s.tipo_consumo === "LOCAL" ? "En local" : "Para llevar"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{formatPEN(s.total)}</span>
              {s.status === "ANULADA" ? (
                <Badge variant="destructive">Anulada</Badge>
              ) : (
                canAnular && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Anular venta"
                    onClick={() => {
                      if (confirm(`¿Anular la venta ${s.serie}-${s.numero}?`)) anular.mutate(s.id);
                    }}
                  >
                    <Ban className="h-4 w-4 text-destructive" />
                  </Button>
                )
              )}
            </div>
          </div>
        ))}
        {sales?.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No hay ventas registradas.
          </p>
        )}
      </div>
    </div>
  );
}

function ReceiptDialog({ sale, onClose }: { sale: LastSale | null; onClose: () => void }) {
  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs">
        <div className="print-area mx-auto w-[72mm] text-[11px] leading-snug">
          <div className="text-center">
            <p className="text-sm font-bold">PIERO&apos;S</p>
            <p className="text-muted-foreground">
              {sale?.result.serie}-{sale?.result.numero}
            </p>
            <p className="text-muted-foreground">{new Date().toLocaleString("es-PE")}</p>
          </div>
          <div className="my-2 border-t border-dashed" />
          {sale?.items.map((i) => (
            <div key={i.key} className="flex justify-between gap-2">
              <span className="flex-1 truncate">
                {i.quantity}× {i.name}
                {i.variant_name ? ` (${i.variant_name})` : ""}
              </span>
              <span>{formatPEN(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="my-2 border-t border-dashed" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPEN(sale?.result.subtotal ?? 0)}</span>
          </div>
          {!!sale?.result.descuento && (
            <div className="flex justify-between">
              <span>Descuento</span>
              <span>-{formatPEN(sale.result.descuento)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatPEN(sale?.result.total ?? 0)}</span>
          </div>
          <div className="my-2 border-t border-dashed" />
          {sale?.payments.map((p, i) => (
            <div key={i} className="flex justify-between">
              <span>{PAYMENT_METHODS.find((m) => m.id === p.method)?.label}</span>
              <span>{formatPEN(p.amount)}</span>
            </div>
          ))}
          {!!sale?.change && (
            <div className="flex justify-between">
              <span>Vuelto</span>
              <span>{formatPEN(sale.change)}</span>
            </div>
          )}
          <div className="my-2 border-t border-dashed" />
          <p className="text-center text-muted-foreground">Gracias por su compra</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
