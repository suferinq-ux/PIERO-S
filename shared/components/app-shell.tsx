"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Menu, ChevronDown, Clock } from "lucide-react";
import { Brand } from "@/shared/components/brand";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { NAV_ITEMS, UPCOMING_ITEMS, filterNavByRole } from "@/shared/lib/navigation";
import { cn } from "@/shared/lib/utils";
import { ROLE_LABELS } from "@/shared/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/shared/hooks/use-session";
import type { UserProfile } from "@/shared/types/entities";

function initials(name: string | null): string {
  if (!name) return "P";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavList({ role }: { role: UserProfile["role"] }) {
  const pathname = usePathname();
  const items = filterNavByRole(NAV_ITEMS, role);

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navegación principal">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}

      {UPCOMING_ITEMS.length > 0 && (
        <>
          <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Próximamente
          </p>
          {UPCOMING_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground"
                aria-disabled="true"
              >
                <Icon className="h-5 w-5" />
                {item.label}
                <Clock className="ml-auto h-4 w-4 opacity-60" />
              </div>
            );
          })}
        </>
      )}
    </nav>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-16 border-b bg-background/80" />
        <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile, branches, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && !profile) router.replace("/login");
  }, [isLoading, profile, router]);

  if (isLoading || !profile) return <ShellSkeleton />;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const userMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors hover:bg-secondary">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? ""} />
            <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[160px] truncate text-left sm:block">
            <span className="block font-medium leading-tight">
              {profile.full_name ?? profile.email}
            </span>
            <span className="block text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate">{profile.email}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {branches.length} sucursal{branches.length === 1 ? "" : "es"} asignada
            {branches.length === 1 ? "" : "s"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-svh">
      {/* Sidebar (escritorio) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="px-4 py-4">
          <Brand />
        </div>
        <NavList role={profile.role} />
        <div className="border-t p-3">{userMenu}</div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            {/* Menú móvil */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col p-0">
                <SheetHeader className="border-b px-4 py-4">
                  <SheetTitle className="flex items-center gap-2">
                    <Brand />
                  </SheetTitle>
                </SheetHeader>
                <NavList role={profile.role} />
                <div className="border-t p-3">{userMenu}</div>
              </SheetContent>
            </Sheet>

            {/* Marca en la barra superior (dorada) */}
            <Brand markClassName="h-8 w-8 text-base" nameClassName="text-base" />
          </div>

          <div className="flex items-center gap-2">
            {profile.role === "SUPER_ADMIN" && (
              <Badge variant="soft" className="hidden sm:inline-flex">
                {branches.length} sucursal{branches.length === 1 ? "" : "es"}
              </Badge>
            )}
            <div className="lg:hidden">{userMenu}</div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
