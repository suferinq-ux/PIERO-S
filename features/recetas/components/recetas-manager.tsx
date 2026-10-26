"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatPEN } from "@/shared/lib/format";
import { recipeRepository } from "../repository";
import { computeRecipeEconomics } from "../service";
import { RecetaForm } from "./receta-form";
import type { RecipeWithDetails, SaveRecipePayload } from "../types";

export function RecetasManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecipeWithDetails | null>(null);

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: recipeRepository.list,
  });
  const { data: supplies = [] } = useQuery({
    queryKey: ["supplies"],
    queryFn: recipeRepository.listSupplies,
  });
  const { data: productsData } = useQuery({
    queryKey: ["products-variants"],
    queryFn: recipeRepository.listProductsWithVariants,
  });
  const { data: prices = [] } = useQuery({
    queryKey: ["prices"],
    queryFn: recipeRepository.listPrices,
  });

  const mutation = useMutation({
    mutationFn: recipeRepository.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setOpen(false);
      setEditing(null);
      toast.success("Receta guardada correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: recipeRepository.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Receta eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function referencePrice(recipe: RecipeWithDetails): number | null {
    const list = prices.filter((p) => p.product_id === recipe.product_id).map((p) => p.price);
    return list.length ? Math.min(...list) : null;
  }

  function economics(recipe: RecipeWithDetails) {
    return computeRecipeEconomics(
      recipe.items.map((i) => ({ cantidad: i.cantidad, costo: i.supply?.costo ?? 0 })),
      recipe.rendimiento,
      referencePrice(recipe),
    );
  }

  function handleSubmit(payload: SaveRecipePayload) {
    mutation.mutate(payload);
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {recipes?.length ?? 0} receta{(recipes?.length ?? 0) === 1 ? "" : "s"}
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nueva receta
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receta</TableHead>
              <TableHead className="hidden md:table-cell">Producto</TableHead>
              <TableHead className="hidden sm:table-cell">Rendimiento</TableHead>
              <TableHead>Costo unit.</TableHead>
              <TableHead className="hidden sm:table-cell">Margen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(recipes ?? []).map((recipe) => {
              const eco = economics(recipe);
              return (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">{recipe.nombre}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {recipe.product?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {recipe.rendimiento} {recipe.unidad_rendimiento}
                  </TableCell>
                  <TableCell>{formatPEN(eco.unitCost)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {eco.margin !== null ? `${eco.margin}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={recipe.is_active ? "soft" : "outline"}>
                      {recipe.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar receta"
                        onClick={() => {
                          setEditing(recipe);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar"
                        onClick={() => {
                          if (confirm(`¿Eliminar la receta "${recipe.nombre}"?`)) {
                            remove.mutate(recipe.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <RecetaForm
        open={open}
        onOpenChange={setOpen}
        recipe={editing}
        products={productsData?.products ?? []}
        variants={productsData?.variants ?? []}
        supplies={supplies}
        prices={prices}
        onSubmit={handleSubmit}
        loading={mutation.isPending}
      />
    </div>
  );
}
