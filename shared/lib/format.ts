import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

/** Formatea un monto en soles peruanos: S/ 1,234.50 */
export function formatPEN(value: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

/** Formatea un monto sin símbolo, solo número con 2 decimales. */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Fecha legible en español: 15 de enero de 2026 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Fecha corta: 15/01/2026 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy", { locale: es });
}

/** Hora: 14:30 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "HH:mm", { locale: es });
}

/** Hora relativa: "hace 5 minutos" */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}
