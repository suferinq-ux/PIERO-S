import { MapPin, Phone, Clock, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import type { Branch } from "@/shared/types/entities";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: branchesData } = await supabase
    .from("branches")
    .select("*")
    .order("nombre", { ascending: true });

  const list = (branchesData ?? []) as Branch[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold">Bienvenido a PIERO&apos;S</h2>
        <p className="text-sm text-muted-foreground">
          Panel de control multisucursal. Los KPIs de ventas, stock y reportes llegan en las
          próximas fases.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Store className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aún no hay sucursales registradas. Crea la primera desde el módulo Sucursales.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((branch) => (
            <Card key={branch.id}>
              <CardHeader>
                <CardTitle>{branch.nombre}</CardTitle>
                <CardDescription className="uppercase">{branch.codigo ?? ""}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {branch.direccion && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {branch.direccion}
                  </p>
                )}
                {branch.telefono && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> {branch.telefono}
                  </p>
                )}
                {branch.horario && (
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> {branch.horario}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
