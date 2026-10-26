import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: {
    default: "PIERO'S — Gestión de pastelería",
    template: "%s · PIERO'S",
  },
  description:
    "Sistema de gestión multisucursal para la pastelería PIERO'S (Ayacucho, Perú): ventas, inventario, caja, pedidos y reportes.",
};

export const viewport: Viewport = {
  themeColor: "#E75480",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${poppins.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
