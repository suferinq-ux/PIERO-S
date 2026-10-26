import { expect, test } from "@playwright/test";

// Smoke test de la Fase 1: la pantalla de login se renderiza correctamente.
// Los flujos críticos (venta, cierre de caja, transferencia) se añaden en sus
// fases correspondientes.

test.describe("Autenticación", () => {
  test("muestra el formulario de inicio de sesión", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  });

  test("redirige a login al acceder sin sesión", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
