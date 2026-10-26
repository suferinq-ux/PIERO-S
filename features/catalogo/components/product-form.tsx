"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
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
import { createClient } from "@/lib/supabase/client";
import { productSchema, type ProductValues } from "../schemas";
import type { PriceInput, ProductWithDetails, SaveProductPayload, VariantInput } from "../types";
import type { Branch, Category } from "@/shared/types/entities";

const BASE_KEY = "base";

export function ProductForm({
  open,
  onOpenChange,
  product,
  categories,
  branches,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithDetails | null;
  categories: Category[];
  branches: Branch[];
  onSubmit: (payload: SaveProductPayload) => void;
  loading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceInput>>({});

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nombre: "",
      category_id: "",
      descripcion: "",
      barcode: "",
      image_url: "",
      has_variants: false,
      is_active: true,
    },
  });

  const hasVariants = form.watch("has_variants");

  useEffect(() => {
    if (!open) return;
    form.reset(
      product
        ? {
            nombre: product.nombre,
            category_id: product.category_id,
            descripcion: product.descripcion ?? "",
            barcode: product.barcode ?? "",
            image_url: product.image_url ?? "",
            has_variants: product.has_variants,
            is_active: product.is_active,
          }
        : {
            nombre: "",
            category_id: "",
            descripcion: "",
            barcode: "",
            image_url: "",
            has_variants: false,
            is_active: true,
          },
    );

    setVariants(
      product?.variants.map((v) => ({ localId: v.id, id: v.id, nombre: v.nombre, sku: v.sku })) ??
        [],
    );

    const priceMap: Record<string, PriceInput> = {};
    for (const p of product?.prices ?? []) {
      const key = p.variant_id ?? BASE_KEY;
      priceMap[`${key}|${p.branch_id}`] = {
        id: p.id,
        variantLocalId: p.variant_id,
        branch_id: p.branch_id,
        price: p.price,
      };
    }
    setPrices(priceMap);
  }, [open, product, form]);

  function priceKey(key: string, branchId: string) {
    return `${key}|${branchId}`;
  }

  function setPrice(key: string, branchId: string, value: number) {
    setPrices((prev) => {
      const pk = priceKey(key, branchId);
      const existing = prev[pk];
      return {
        ...prev,
        [pk]: {
          id: existing?.id,
          variantLocalId: key === BASE_KEY ? null : key,
          branch_id: branchId,
          price: value,
        },
      };
    });
  }

  function getPrice(key: string, branchId: string): number {
    return prices[priceKey(key, branchId)]?.price ?? 0;
  }

  function addVariant() {
    setVariants((v) => [...v, { localId: crypto.randomUUID(), nombre: "", sku: "" }]);
  }

  function updateVariant(localId: string, field: "nombre" | "sku", value: string) {
    setVariants((v) => v.map((x) => (x.localId === localId ? { ...x, [field]: value } : x)));
  }

  function removeVariant(localId: string) {
    setVariants((v) => v.filter((x) => x.localId !== localId));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("productos").upload(path, file, {
      cacheControl: "3600",
    });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("productos").getPublicUrl(path);
    form.setValue("image_url", data.publicUrl, { shouldDirty: true });
    setUploading(false);
  }

  function handleSubmit(values: ProductValues) {
    const priceRows = hasVariants ? variants.map((v) => v.localId) : [BASE_KEY];
    const validKeys = new Set(priceRows);
    const priceList: PriceInput[] = Object.values(prices).filter((p) =>
      validKeys.has(p.variantLocalId ?? BASE_KEY),
    );

    onSubmit({
      product: {
        id: product?.id,
        category_id: values.category_id,
        nombre: values.nombre,
        descripcion: values.descripcion,
        image_url: values.image_url,
        barcode: values.barcode,
        has_variants: values.has_variants,
        is_active: values.is_active,
      },
      variants: hasVariants ? variants : [],
      prices: priceList,
    });
  }

  const imageUrl = form.watch("image_url");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Configura el producto, sus variantes y los precios por sucursal.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="max-h-[70vh] space-y-6 overflow-y-auto pr-1"
            id="product-form"
          >
            {/* Datos del producto */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Bocadito de queso" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
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
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de barras</FormLabel>
                    <FormControl>
                      <Input placeholder="7750100000011" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Producto activo</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción opcional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Imagen */}
              <div className="sm:col-span-2 space-y-2">
                <Label>Imagen</Label>
                <div className="flex items-center gap-3">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Imagen del producto"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        {uploading ? "Subiendo…" : "Subir imagen"}
                      </Button>
                      {imageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => form.setValue("image_url", "")}
                        >
                          <X className="h-4 w-4" /> Quitar
                        </Button>
                      )}
                    </div>
                    {imageUrl && (
                      <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                        {imageUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="has_variants"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <FormLabel>Tiene variantes</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Tamaños, sabores u otras variantes del producto.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Variantes */}
            {hasVariants && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Variantes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                </div>
                {variants.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Agrega al menos una variante (ej. Personal, Familiar).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {variants.map((variant) => (
                      <div key={variant.localId} className="flex items-center gap-2">
                        <Input
                          placeholder="Nombre (ej. Personal)"
                          value={variant.nombre}
                          onChange={(e) => updateVariant(variant.localId, "nombre", e.target.value)}
                        />
                        <Input
                          placeholder="SKU"
                          className="max-w-[140px]"
                          value={variant.sku ?? ""}
                          onChange={(e) => updateVariant(variant.localId, "sku", e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar variante"
                          onClick={() => removeVariant(variant.localId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Precios por sucursal */}
            <div className="space-y-2">
              <Label>Precios por sucursal</Label>
              {branches.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  No hay sucursales registradas. Crea una para asignar precios.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Variante</th>
                        {branches.map((b) => (
                          <th key={b.id} className="px-3 py-2 text-left font-medium">
                            {b.nombre}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(hasVariants ? variants : [{ localId: BASE_KEY, nombre: "" }]).map((row) => (
                        <tr key={row.localId} className="border-b last:border-0">
                          <td className="px-3 py-2 text-muted-foreground">
                            {hasVariants ? row.nombre || "—" : "Base"}
                          </td>
                          {branches.map((b) => (
                            <td key={b.id} className="px-3 py-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-9 w-28"
                                value={getPrice(row.localId, b.id) || ""}
                                placeholder="0.00"
                                onChange={(e) =>
                                  setPrice(row.localId, b.id, Number(e.target.value) || 0)
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form" disabled={loading || uploading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
