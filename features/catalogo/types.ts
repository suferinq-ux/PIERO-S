import type { Branch, Category, Product, ProductVariant } from "@/shared/types/entities";

export interface ProductPrice {
  id: string;
  product_id: string;
  variant_id: string | null;
  branch_id: string;
  price: number;
  is_active: boolean;
}

export interface ProductWithDetails extends Product {
  category: Category | null;
  variants: ProductVariant[];
  prices: ProductPrice[];
}

/** Variante en edición. `localId` es una clave local estable (para nuevos). */
export interface VariantInput {
  localId: string;
  id?: string;
  nombre: string;
  sku: string | null;
}

/** Precio en edición. `variantLocalId` es null para el producto base. */
export interface PriceInput {
  id?: string;
  variantLocalId: string | null;
  branch_id: string;
  price: number;
}

export interface SaveProductPayload {
  product: {
    id?: string;
    category_id: string;
    nombre: string;
    descripcion: string | null;
    image_url: string | null;
    barcode: string | null;
    has_variants: boolean;
    is_active: boolean;
  };
  variants: VariantInput[];
  prices: PriceInput[];
}

export interface CatalogRepository {
  listCategories(): Promise<Category[]>;
  saveCategory(
    values: { nombre: string; descripcion: string; is_active: boolean },
    id?: string,
  ): Promise<void>;
  removeCategory(id: string): Promise<void>;
  listBranches(): Promise<Branch[]>;
  listProducts(): Promise<ProductWithDetails[]>;
  saveProduct(payload: SaveProductPayload): Promise<string>;
  removeProduct(id: string): Promise<void>;
}
