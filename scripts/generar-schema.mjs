// Genera supabase/schema.sql concatenando las migraciones en orden.
// Uso: npm run schema
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const header = `-- =============================================================================
-- PIERO'S — Esquema completo de Supabase (GENERADO)
-- =============================================================================
-- Este archivo es GENERADO: no lo edites a mano.
-- Se reconstruye con: npm run schema
-- Equivale a ejecutar en orden todas las migraciones de supabase/migrations/.
-- Incluye enums, tablas, índices, funciones, RLS, triggers y el bucket de
-- Storage. NO incluye datos de ejemplo (ver supabase/seed.sql).
-- =============================================================================

`;

const body = files
  .map((f) => `-- >>> ${f}\n\n${readFileSync(join(migrationsDir, f), "utf8").trim()}`)
  .join("\n\n");

writeFileSync(join(process.cwd(), "supabase", "schema.sql"), header + body + "\n");

console.log(`supabase/schema.sql generado con ${files.length} migraciones:`);
for (const f of files) console.log(`  - ${f}`);
