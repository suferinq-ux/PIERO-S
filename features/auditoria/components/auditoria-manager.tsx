"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatRelative } from "@/shared/lib/format";
import { auditRepository } from "../repository";

const ENTIDADES = ["venta", "caja", "transferencia", "produccion", "compra", "INSUMO", "PRODUCTO"];

export function AuditoriaManager() {
  const [entidad, setEntidad] = useState("");
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: auditRepository.list,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (logs ?? []).filter((l) => {
      const matchEntity = !entidad || l.entidad === entidad;
      const matchSearch =
        !q ||
        l.accion.toLowerCase().includes(q) ||
        l.user_name.toLowerCase().includes(q) ||
        l.entidad.toLowerCase().includes(q);
      return matchEntity && matchSearch;
    });
  }, [logs, entidad, search]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar acción o usuario…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={entidad} onValueChange={setEntidad}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Todas las entidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las entidades</SelectItem>
            {ENTIDADES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead className="hidden md:table-cell">Usuario</TableHead>
              <TableHead className="hidden sm:table-cell">Sucursal</TableHead>
              <TableHead className="hidden lg:table-cell">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground">
                  {formatRelative(l.created_at)}
                </TableCell>
                <TableCell>
                  <Badge variant="soft">{l.accion}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{l.entidad}</TableCell>
                <TableCell className="hidden md:table-cell">{l.user_name}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {l.branch_name}
                </TableCell>
                <TableCell className="hidden max-w-[260px] truncate text-xs text-muted-foreground lg:table-cell">
                  {l.detalles ? JSON.stringify(l.detalles) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <ScrollText className="mx-auto mb-2 h-8 w-8" />
                  No hay registros de auditoría.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
