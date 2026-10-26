/**
 * Logo placeholder de PIERO'S (SVG). Reemplazable desde configuración
 * (`business_settings.negocio.logo_url`) o editando este archivo.
 * Usa `currentColor` para adaptarse al contexto.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      {/* cupcake */}
      <path
        d="M16 5c-2.2 0-4 1.8-4 4v1.5c-2.5.6-4.5 2.8-4.5 5.5 0 1.4.5 2.7 1.4 3.7L10 27h12l1.1-7.3c.9-1 1.4-2.3 1.4-3.7 0-2.7-2-4.9-4.5-5.5V9c0-2.2-1.8-4-4-4Z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* frosting */}
      <path
        d="M8.5 16.5c.3-1.8 1.8-3.2 3.7-3.3-.1.5-.2 1-.2 1.5 0 1.4.4 2.8 1 3.9.2-.4.5-.8.9-1 .6 1 .9 2.2.9 3.4h.4c0-1.2.3-2.4.9-3.4.4.2.7.6.9 1 .6-1.1 1-2.5 1-3.9 0-.5-.1-1-.2-1.5 1.9.1 3.4 1.5 3.7 3.3-.6.2-1.2.4-1.8.8-.8.5-1.5 1.2-2 2-.5-.8-1.2-1.5-2-2-.7.5-1.3 1.1-1.8 1.8-.5-.7-1.1-1.3-1.8-1.8-.8.5-1.5 1.2-2 2-.5-.8-1.2-1.5-2-2-.6-.4-1.2-.6-1.8-.8Z"
        fill="#fff"
        opacity="0.9"
      />
      {/* cherry */}
      <circle cx="16" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
