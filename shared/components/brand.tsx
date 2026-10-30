import { cn } from "@/shared/lib/utils";

/**
 * Marca de PIERO'S: monograma "P" dorado + nombre.
 * Se usa en la barra superior y en la cabecera del menú lateral.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-[#F3D97A] via-[#D4AF37] to-[#A67C00] text-white shadow-soft ring-1 ring-[#A67C00]/30",
        className,
      )}
      aria-hidden="true"
    >
      <span className="font-heading font-bold leading-none tracking-tight">P</span>
    </div>
  );
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading font-bold tracking-tight text-gold-dark", className)}>
      PIERO&apos;S
    </span>
  );
}

export function Brand({
  markClassName,
  nameClassName,
}: {
  markClassName?: string;
  nameClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <BrandMark className={cn("h-9 w-9 text-lg", markClassName)} />
      <BrandName className={cn("text-lg", nameClassName)} />
    </div>
  );
}
