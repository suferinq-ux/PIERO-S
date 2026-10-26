import { Logo } from "@/shared/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-soft p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <Logo className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">PIERO&apos;S</h1>
            <p className="text-sm text-muted-foreground">Gestión de pastelería</p>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-card">{children}</div>
      </div>
    </div>
  );
}
