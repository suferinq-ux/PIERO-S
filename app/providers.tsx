"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { PwaRegister } from "./pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cachea los datos para que volver a un módulo sea instantáneo.
            staleTime: 5 * 60_000,
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
      <PwaRegister />
      <Toaster />
    </QueryClientProvider>
  );
}
