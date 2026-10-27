# PIERO'S — Sistema de gestión para pastelería

Sistema de gestión profesional, **multisucursal** y responsive para la
pastelería **PIERO'S** (Ayacucho, Perú). Gestiona bocaditos, tortas, gelatinas,
cafés, jugos y otros productos, con punto de venta, inventario, caja, pedidos
por encargo, compras, gastos y reportes.

> **PIERO'S** se escribe siempre en mayúsculas en títulos y encabezados.

## Stack

| Capa                | Tecnología                                                            |
| ------------------- | --------------------------------------------------------------------- |
| Frontend            | Next.js (App Router) + TypeScript estricto + Tailwind CSS + shadcn/ui |
| Backend / datos     | Supabase (PostgreSQL, Auth, RLS, Storage, Realtime)                   |
| Estado del servidor | TanStack Query                                                        |
| Formularios         | React Hook Form + Zod                                                 |
| Gráficos            | Recharts                                                              |
| Fechas / moneda     | date-fns (locale `es-PE`) · moneda S/ (PEN)                           |
| Testing             | Vitest (dominio) · Playwright (flujos críticos) · pgTAP (RLS)         |
| Calidad             | ESLint · Prettier · Husky · commitlint (convencionales)               |

## Identidad visual

| Token                | Valor     | Uso                              |
| -------------------- | --------- | -------------------------------- |
| `--primary`          | `#E75480` | Rosa primario (botones, acentos) |
| `--primary-soft`     | `#FCE4EC` | Rosa suave (fondos)              |
| `--primary-dark`     | `#A83254` | Rosa oscuro (textos, acentos)    |
| `--background`       | `#FFFFFF` | Fondo                            |
| `--muted-foreground` | `#5C4A50` | Texto secundario                 |

Estos colores viven como **tokens CSS** en `app/globals.css`. Para cambiar la
paleta, edita ese único archivo (y su espejo en `tailwind.config.ts`).

Tipografía: **Poppins** (títulos) e **Inter** (texto), cargadas vía
`next/font/google`.

## Requisitos previos

- Node.js 20+ y npm
- Cuenta de [Supabase](https://supabase.com) (proyecto en blanco)
- (Opcional) [Supabase CLI](https://supabase.com/docs/guides/cli) para migraciones locales
- (Opcional) Docker para `supabase start`

## Instalación

```bash
git clone <repo> pieros
cd pieros
npm install
cp .env.example .env.local
```

Completa `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# Solo servidor (NUNCA en el frontend):
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev        # http://localhost:3000
```

## Variables de entorno

Ver `.env.example`. Reglas de oro:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` es pública (RLS la protege).
- `SUPABASE_SERVICE_ROLE_KEY` **solo** se usa en el servidor (RSC / API routes)
  y **jamás** se expone al cliente ni se versiona.

## Base de datos y migraciones

El esquema vive en `supabase/migrations/` (versionado, formato Supabase CLI).

```bash
# Aplicar migraciones (con CLI y proyecto enlazado)
supabase link --project-ref <ref>
supabase db push

# O copiar el contenido de las migraciones en el SQL Editor de Supabase, en orden.

# Semilla de datos de ejemplo (2 sucursales en Ayacucho, catálogo, insumos)
supabase db reset            # aplica migraciones + seed.sql
# o, manualmente, ejecutar supabase/seed.sql en el SQL Editor.
```

### Operaciones transaccionales (RPC)

Las operaciones críticas —ajuste de stock, mermas, envío/recepción de
transferencias, completar producción, registrar/anular venta y apertura/cierre
de caja— son funciones PostgreSQL atómicas (migraciones
`20260101000005_rpc_inventario.sql` y `20260101000006_rpc_ventas_caja.sql`) que
validan rol y sucursal internamente y actualizan stock, kardex, caja y auditoría
en una sola transacción. Se invocan desde la app con `supabase.rpc(...)`.

### Imágenes (Storage)

La migración 4 crea el bucket público `productos` para las imágenes del catálogo
(límite 5 MB, `image/png|jpeg|webp`), con lectura pública y escritura solo para
usuarios autenticados. Si el bucket no existe (por ejemplo al usar un proyecto ya
creado), vuelve a aplicar `supabase/migrations/20260101000004_storage.sql`.

### Crear el primer SUPER_ADMIN

Las cuentas nuevas se crean con rol `VENDEDOR_SOLO_LECTURA` (mínimo privilegio).
El trigger `trig_proteger_rol_perfil` impide el auto-ascenso desde la app. Para
promover al primer superadmin, ejecuta en el **SQL Editor** de Supabase:

```sql
update public.users_profiles
set role = 'SUPER_ADMIN'
where email = 'admin@pieros.pe';
```

## Comandos

```bash
npm run dev          # desarrollo
npm run build        # build de producción (validación real: tsc + next build)
npm run start        # sirve el build
npm run lint         # eslint
npm run format       # prettier
npm run typecheck    # tsc --noEmit
npm run test         # vitest (dominio + servicios)
npm run test:e2e     # playwright (flujos críticos)
```

## Tests

- **Vitest** (`tests/unit`): reglas de dominio puras — precios, IGV, costo de
  recetas, descuento de stock, estados de pedidos.
- **Playwright** (`tests/e2e`): venta, cierre de caja y transferencia.
- **pgTAP** (`supabase/tests`): políticas RLS por rol.

## Despliegue

- **Frontend:** [Vercel](https://vercel.com). Importa el repo y define las
  variables de entorno. `next.config` ya está listo para producción.
- **Backend/BD:** Supabase. `supabase db push` para aplicar migraciones.

---

## Decisiones asumidas (documentadas)

- **Numeración de comprobantes por sucursal:** `sales.numero` + `branches.serie_boleta`
  / `serie_factura`. La secuencia se genera dentro de la RPC `registrar_venta`.
- **IGV (18%) opcional:** `business_settings.igv_enabled` y `igv_rate`. El dominio
  lo calcula solo si está habilitado; por defecto los precios se manejan sin IGV
  desglosado (ver `domain/pricing.ts`).
- **Métodos de pago fijos:** `EFECTIVO`, `YAPE`, `PLIN`, `TARJETA`, `MIXTO`.
- **Módulo SUNAT desacoplado:** no se emite comprobante electrónico en esta
  versión; se deja el puerto `EmissionService` y el adapter `FakeEmissionAdapter`.
  Ver `docs/ARQUITECTURA.md §7`.
- **Usuarios nuevos con rol mínimo:** `VENDEDOR_SOLO_LECTURA` hasta que un
  superadmin lo cambie.
- **Soft delete** en catálogo, insumos, recetas, clientes y proveedores
  (columna `deleted_at`).

## Estructura

Ver `docs/ARQUITECTURA.md` para el detalle de arquitectura, diagramas y plan de
fases.
