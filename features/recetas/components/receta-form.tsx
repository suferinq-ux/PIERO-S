"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
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
import { formatPEN } from "@/shared/lib/format";
import { recipeSchema, type RecipeValues } from "../schemas";
import { computeRecipeEconomics } from "../service";
import type { ProductPrice, RecipeItemInput, RecipeWithDetails, SaveRecipePayload } from "../types";
import type { Product, ProductVariant, Supply } from "@/shared/types/entities";

export function RecetaForm({
  open,
  onOpenChange,
  recipe,
  products,
  variants,
  supplies,
  prices,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: RecipeWithDetails | null;
  products: Product[];
  variants: ProductVariant[];
  supplies: Supply[];
  prices: ProductPrice[];
  onSubmit: (payload: SaveRecipePayload) => void;
  loading: boolean;
}) {
  const [items, setItems] = useState<RecipeItemInput[]>([]);

  const form = useForm<RecipeValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      product_id: "",
      variant_id: "",
      nombre: "",
      rendimiento: 1,
      unidad_rendimiento: "unidad",
      instrucciones: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      recipe
        ? {
            product_id: recipe.product_id,
            variant_id: recipe.variant_id ?? "",
            nombre: recipe.nombre,
            rendimiento: recipe.rendimiento,
            unidad_rendimiento: recipe.unidad_rendimiento,
            instrucciones: recipe.instrucciones ?? "",
          }
        : {
            product_id: "",
            variant_id: "",
            nombre: "",
            rendimiento: 1,
            unidad_rendimiento: "unidad",
            instrucciones: "",
          },
    );
    setItems(recipe?.items.map((i) => ({ supply_id: i.supply_id, cantidad: i.cantidad })) ?? []);
  }, [open, recipe, form]);

  const productId = form.watch("product_id");
  const rendimiento = form.watch("rendimiento") || 0;

  const productVariants = useMemo(
    () => variants.filter((v) => v.product_id === productId),
    [variants, productId],
  );

  // Precio de referencia = precio mínimo del producto (para el margen).
  const referencePrice = useMemo(() => {
    const list = prices.filter((p) => p.product_id === productId).map((p) => p.price);
    return list.length ? Math.min(...list) : null;
  }, [prices, productId]);

  const economics = useMemo(() => {
    const ingredients = items.map((i) => ({
      cantidad: i.cantidad,
      costo: supplies.find((s) => s.id === i.supply_id)?.costo ?? 0,
    }));
    return computeRecipeEconomics(ingredients, rendimiento, referencePrice);
  }, [items, supplies, rendimiento, referencePrice]);

  function onProductChange(value: string) {
    form.setValue("product_id", value);
    form.setValue("variant_id", "");
    const product = products.find((p) => p.id === value);
    if (product) form.setValue("nombre", product.nombre);
  }

  function addItem() {
    setItems((prev) => [...prev, { supply_id: "", cantidad: 0 }]);
  }

  function updateItem(index: number, patch: Partial<RecipeItemInput>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(values: RecipeValues) {
    onSubmit({
      id: recipe?.id,
      product_id: values.product_id,
      variant_id: values.variant_id || null,
      nombre: values.nombre,
      rendimiento: values.rendimiento,
      unidad_rendimiento: values.unidad_rendimiento,
      instrucciones: values.instrucciones,
      items: items.filter((i) => i.supply_id),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recipe ? "Editar receta" : "Nueva receta"}</DialogTitle>
          <DialogDescription>
            Define los insumos y el rendimiento para calcular el costo automáticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="max-h-[70vh] space-y-6 overflow-y-auto pr-1"
            id="recipe-form"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producto</FormLabel>
                    <Select onValueChange={onProductChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
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

              {productVariants.length > 0 && (
                <FormField
                  control={form.control}
                  name="variant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variante</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Base" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Base (sin variante)</SelectItem>
                          {productVariants.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la receta</FormLabel>
                    <FormControl>
                      <Input placeholder="Bocadito de queso (docena)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rendimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rendimiento</FormLabel>
                      <FormControl>
                        <Input type="number" min="0.01" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unidad_rendimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad</FormLabel>
                      <FormControl>
                        <Input placeholder="unidad, docena…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="instrucciones"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Instrucciones</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Preparación (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Insumos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Insumos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4" /> Agregar insumo
                </Button>
              </div>
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  Agrega los insumos que componen la receta.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={item.supply_id}
                        onValueChange={(v) => updateItem(index, { supply_id: v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Insumo" />
                        </SelectTrigger>
                        <SelectContent>
                          {supplies.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nombre} ({s.unidad_medida})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-28"
                        placeholder="Cant."
                        value={item.cantidad || ""}
                        onChange={(e) =>
                          updateItem(index, { cantidad: Number(e.target.value) || 0 })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar insumo"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Costo calculado */}
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Costo total</p>
                <p className="text-lg font-semibold">{formatPEN(economics.totalCost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo unitario</p>
                <p className="text-lg font-semibold">{formatPEN(economics.unitCost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margen</p>
                <p className="text-lg font-semibold">
                  {economics.margin !== null ? `${economics.margin}%` : "—"}
                </p>
              </div>
            </div>
            {referencePrice !== null && (
              <p className="text-xs text-muted-foreground">
                Precio de referencia: {formatPEN(referencePrice)}
              </p>
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="recipe-form" disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
