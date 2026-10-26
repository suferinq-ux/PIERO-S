"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
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
import { catalogRepository } from "../repository";
import { ProductForm } from "./product-form";
import type { ProductWithDetails, SaveProductPayload } from "../types";

export function ProductManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithDetails | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: catalogRepository.listProducts,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: catalogRepository.listCategories,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: catalogRepository.listBranches,
  });

  const mutation = useMutation({
    mutationFn: catalogRepository.saveProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditing(null);
      toast.success("Producto guardado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: catalogRepository.removeProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(payload: SaveProductPayload) {
    mutation.mutate(payload);
  }

  function minPrice(product: ProductWithDetails): number | null {
    const list = product.prices.map((p) => p.price).filter((p) => p > 0);
    return list.length ? Math.min(...list) : null;
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {products?.length ?? 0} producto{(products?.length ?? 0) === 1 ? "" : "s"}
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="hidden md:table-cell">Categoría</TableHead>
              <TableHead className="hidden sm:table-cell">Variantes</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(products ?? []).map((product) => {
              const price = minPrice(product);
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.nombre}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {product.category?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {product.has_variants ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Layers className="h-4 w-4" /> {product.variants.length}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{price !== null ? formatPEN(price) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? "soft" : "outline"}>
                      {product.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar producto"
                        onClick={() => {
                          setEditing(product);
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
                          if (confirm(`¿Eliminar el producto "${product.nombre}"?`)) {
                            remove.mutate(product.id);
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

      <ProductForm
        open={open}
        onOpenChange={setOpen}
        product={editing}
        categories={categories}
        branches={branches}
        onSubmit={handleSubmit}
        loading={mutation.isPending}
      />
    </div>
  );
}
