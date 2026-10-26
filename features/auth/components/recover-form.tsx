"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { recoverSchema, type RecoverValues } from "@/features/auth/schemas";
import { createAuthService } from "@/features/auth/service";
import { supabaseAuthRepository } from "@/features/auth/repository";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

const authService = createAuthService(supabaseAuthRepository);

export function RecoverForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<RecoverValues>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: RecoverValues) {
    setLoading(true);
    const { error } = await authService.recoverPassword(values.email);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
        </p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="tu@correo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Enviando…" : "Enviar enlace"}
        </Button>
        <Link href="/login" className="block text-center text-sm text-primary hover:underline">
          Volver al inicio de sesión
        </Link>
      </form>
    </Form>
  );
}
