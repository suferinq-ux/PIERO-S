// Cliente Supabase simulado para el modo demo (sin backend).
// Implementa el subconjunto de la API que usan los repositorios.
import { DEMO_USER_ID, demoId, getDemoData, type DemoRow } from "./demo-data";

type Filter = (row: DemoRow) => boolean;
type Op = "select" | "insert" | "update" | "delete" | "upsert";
interface Result {
  data: unknown;
  error: null;
}

class DemoQuery implements PromiseLike<Result> {
  private table: string;
  private filters: Filter[] = [];
  private orderBy?: { col: string; asc: boolean };
  private limitN?: number;
  private op: Op = "select";
  private payload: unknown;
  private returning = false;
  private onConflict?: string;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: string) {
    this.returning = true;
    return this;
  }
  insert(payload: unknown) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: unknown) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  upsert(payload: unknown, opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = payload;
    this.onConflict = opts?.onConflict;
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  is(col: string, val: unknown) {
    this.filters.push((r) => (val === null ? r[col] == null : r[col] === val));
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[col]));
    return this;
  }
  gte(col: string, val: unknown) {
    this.filters.push((r) => new Date(String(r[col])) >= new Date(String(val)));
    return this;
  }
  lte(col: string, val: unknown) {
    this.filters.push((r) => new Date(String(r[col])) <= new Date(String(val)));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending ?? true };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }

  single(): Promise<Result> {
    return this.run().then((r) => ({
      data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data,
      error: null,
    }));
  }
  maybeSingle(): Promise<Result> {
    return this.single();
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<Result> {
    const db = getDemoData();
    const table = (db[this.table] ??= []);

    if (this.op === "insert") {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]) as DemoRow[];
      const inserted = rows.map((r) => ({
        id: (r.id as string) ?? demoId(),
        created_at: (r.created_at as string) ?? new Date().toISOString(),
        ...r,
      }));
      table.push(...inserted);
      return {
        data: this.returning ? (Array.isArray(this.payload) ? inserted : inserted[0]) : null,
        error: null,
      };
    }

    if (this.op === "update") {
      const updated: DemoRow[] = [];
      for (const row of table) {
        if (this.filters.every((f) => f(row))) {
          Object.assign(row, this.payload as DemoRow, { updated_at: new Date().toISOString() });
          updated.push(row);
        }
      }
      return { data: this.returning ? (updated[0] ?? null) : null, error: null };
    }

    if (this.op === "delete") {
      db[this.table] = table.filter((row) => !this.filters.every((f) => f(row)));
      return { data: null, error: null };
    }

    if (this.op === "upsert") {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]) as DemoRow[];
      const cols = this.onConflict ? this.onConflict.split(",").map((s) => s.trim()) : [];
      for (const r of rows) {
        const existing = cols.length
          ? table.find((row) => cols.every((c) => row[c] === r[c]))
          : undefined;
        if (existing) Object.assign(existing, r);
        else table.push({ id: (r.id as string) ?? demoId(), ...r });
      }
      return { data: null, error: null };
    }

    let rows = table.filter((row) => this.filters.every((f) => f(row)));
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const cmp = String(a[col]).localeCompare(String(b[col]));
        return asc ? cmp : -cmp;
      });
    }
    if (this.limitN) rows = rows.slice(0, this.limitN);
    return { data: rows, error: null };
  }
}

let saleSeq = 100;

function demoRpc(name: string, args?: Record<string, unknown>): Result {
  if (name === "registrar_venta") {
    const pays = (args?.p_payments as { amount: number }[] | undefined) ?? [];
    const total = pays.reduce((a, p) => a + Number(p.amount), 0);
    const descuento = Number(args?.p_descuento ?? 0);
    saleSeq += 1;
    return {
      data: {
        id: demoId(),
        numero: saleSeq,
        serie: "B001",
        subtotal: total + descuento,
        descuento,
        total,
      },
      error: null,
    };
  }
  if (name === "cerrar_caja") {
    const real = Number(args?.p_monto_real ?? 0);
    return { data: { esperado: real, real, diferencia: 0 }, error: null };
  }
  if (name === "abrir_caja") return { data: demoId(), error: null };
  return { data: null, error: null };
}

export function createDemoClient() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: DEMO_USER_ID, email: "demo@pieros.pe" } },
        error: null,
      }),
      getSession: async () => ({
        data: { session: { user: { id: DEMO_USER_ID, email: "demo@pieros.pe" } } },
        error: null,
      }),
      getClaims: async () => ({
        data: { claims: { sub: DEMO_USER_ID, email: "demo@pieros.pe" } },
        error: null,
      }),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ error: null }),
      admin: {
        createUser: async () => ({ data: { user: { id: demoId() } }, error: null }),
      },
    },
    from: (table: string) => new DemoQuery(table),
    rpc: async (name: string, args?: Record<string, unknown>) => demoRpc(name, args),
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "/icon.svg" } }),
      }),
    },
  };
}

export const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === "1";
