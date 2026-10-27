export type Role =
  "SUPER_ADMIN" | "ADMIN_SUCURSAL" | "CAJERO" | "PRODUCCION" | "VENDEDOR_SOLO_LECTURA";

export interface Branch {
  id: string;
  nombre: string;
  codigo: string | null;
  direccion: string | null;
  telefono: string | null;
  horario: string | null;
  serie_boleta: string | null;
  serie_factura: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  nombre: string;
  descripcion: string | null;
  sort_order: number;
  is_active: boolean;
  deleted_at: string | null;
}

export interface Product {
  id: string;
  category_id: string;
  nombre: string;
  descripcion: string | null;
  image_url: string | null;
  barcode: string | null;
  has_variants: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  nombre: string;
  sku: string | null;
  is_active: boolean;
}

export interface Supply {
  id: string;
  nombre: string;
  unidad_medida: string;
  costo: number;
  stock_minimo: number;
  is_active: boolean;
}

export interface Recipe {
  id: string;
  product_id: string;
  variant_id: string | null;
  nombre: string;
  rendimiento: number;
  unidad_rendimiento: string;
  instrucciones: string | null;
  is_active: boolean;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  supply_id: string;
  cantidad: number;
}

export interface Customer {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  puntos: number;
  notas: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  is_active: boolean;
}
