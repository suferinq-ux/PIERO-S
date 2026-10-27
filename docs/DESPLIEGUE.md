# PIERO'S — Guía de despliegue

Pasos para llevar PIERO'S a producción: **Supabase** (base de datos, auth y
storage) y **Vercel** (frontend Next.js).

---

## 1. Supabase (backend)

### 1.1 Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
   Guarda la **URL**, la **anon key** y la **service_role key** (Settings → API).
2. Anota la contraseña de la base de datos.

### 1.2 Aplicar el esquema

Tienes dos caminos equivalentes:

**A) Archivo único (SQL Editor)**

1. Abre el **SQL Editor** de Supabase.
2. Copia y ejecuta todo el contenido de **`supabase/schema.sql`** (generado;
   incluye tablas, enums, funciones, RLS, triggers y el bucket de Storage).
3. Ejecuta después **`supabase/seed.sql`** para cargar los datos de ejemplo
   (2 sucursales en Ayacucho, catálogo, insumos, recetas y stock inicial).

> Si cambias las migraciones, regenera el archivo con `npm run schema`. No
> edites `supabase/schema.sql` a mano.

**B) Migraciones con Supabase CLI**

```bash
supabase link --project-ref <ref>
supabase db push          # aplica supabase/migrations en orden
supabase db seed          # o ejecuta supabase/seed.sql manualmente
```

### 1.3 Crear el primer SUPER_ADMIN

Las cuentas nuevas entran con rol mínimo (`VENDEDOR_SOLO_LECTURA`). Registra el
usuario desde la app (o Auth → Users) y promuévelo en el SQL Editor:

```sql
update public.users_profiles
set role = 'SUPER_ADMIN'
where email = 'admin@pieros.pe';
```

### 1.4 Verificar

- **Storage:** debe existir el bucket público `productos`.
- **Auth:** en Authentication → Providers, Email habilitado.
- **RLS:** ejecuta `supabase test db` (local) o revisa que las tablas tengan RLS
  activada (el esquema ya lo hace).

---

## 2. Vercel (frontend)

1. Sube el proyecto a un repositorio de GitHub/GitLab (hoy el repo es local).
2. En [vercel.com](https://vercel.com) → **Add New → Project** e importa el repo.
3. Framework detectado: **Next.js** (build `npm run build`).
4. Define las variables de entorno (Production y Preview):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # solo servidor, nunca en el cliente
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
```

5. Deploy. Verifica que el login, el POS y los reportes funcionen.

> **Nunca** expongas `SUPABASE_SERVICE_ROLE_KEY` en el cliente. Solo la usan las
> API routes del servidor (`/api/usuarios`).

---

## 3. PWA y modo offline

- El manifest (`public/manifest.webmanifest`) y el service worker (`public/sw.js`)
  se sirven desde `public/`. El SW se registra **solo en producción**
  (`app/pwa-register.tsx`).
- Las ventas sin conexión se guardan en **IndexedDB** (`lib/offline/`) y se
  sincronizan automáticamente al recuperar señal o al pulsar el botón de
  pendientes en el POS.
- Para iconos PWA de máxima compatibilidad, añade `public/icons/192.png` y
  `public/icons/512.png` y referéncialos en el manifest (hoy usa `icon.svg`).

---

## 4. Pruebas

```bash
npm run test        # Vitest (dominio y servicios)
npm run test:e2e    # Playwright (venta, cierre de caja, transferencia)
```

Para E2E, define en el entorno (o en `.env.test`) las credenciales del usuario
de prueba:

```env
TEST_USER_EMAIL=admin@pieros.pe
TEST_USER_PASSWORD=...
```

El usuario debe ser `SUPER_ADMIN` con acceso a las dos sucursales del seed.

Tests de RLS (requiere Docker + Supabase local):

```bash
supabase start
supabase test db
```

---

## 5. Checklist de salida a producción

- [ ] `supabase/schema.sql` aplicado y `seed.sql` cargado.
- [ ] Primer `SUPER_ADMIN` promovido en la base (no solo en pantalla).
- [ ] Bucket `productos` creado (lo hace el schema).
- [ ] Variables de entorno cargadas en Vercel.
- [ ] `npm run build` y `npm run lint` en verde.
- [ ] Flujo de venta probado en el POS (descuenta stock y suma caja).
- [ ] Cierre de caja con arqueo probado.
- [ ] Transferencia solicitar → enviar → recibir probada.
- [ ] Reportes Excel/PDF descargan correctamente.
- [ ] Backup de la base configurado en Supabase.
