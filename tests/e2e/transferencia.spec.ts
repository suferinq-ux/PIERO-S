import { expect, test } from "@playwright/test";
import { hasCreds, login } from "./helpers";

/**
 * Requiere las sucursales del seed ("PIERO'S Centro" y "PIERO'S Plaza") y stock
 * disponible. El usuario de prueba debe tener acceso a ambas (SUPER_ADMIN).
 */
test.describe("Transferencias — solicitud, envío y recepción", () => {
  test.skip(!hasCreds(), "Requiere TEST_USER_EMAIL y TEST_USER_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("completa el ciclo de una transferencia", async ({ page }) => {
    await page.goto("/transferencias");
    await page.getByRole("button", { name: "Nueva transferencia" }).click();
    const dialog = page.getByRole("dialog");

    // Origen y destino
    await dialog.getByText("Sucursal origen").click();
    await page.getByRole("option", { name: "PIERO'S Centro" }).click();
    await dialog.getByText("Sucursal destino").click();
    await page.getByRole("option", { name: "PIERO'S Plaza" }).click();

    // Agrega un item con cantidad
    await dialog.getByRole("button", { name: "Agregar" }).click();
    await dialog.getByText("Selecciona un item").click();
    await page.getByRole("option").first().click();
    await dialog.getByPlaceholder("Cant.").fill("1");

    await dialog.getByRole("button", { name: "Solicitar" }).click();
    await expect(page.getByText("Transferencia solicitada")).toBeVisible();

    // Enviar
    const solicitado = page.getByRole("row").filter({ hasText: "Solicitado" }).first();
    await solicitado.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Operación completada")).toBeVisible();

    // Recibir
    const enviado = page.getByRole("row").filter({ hasText: "Enviado" }).first();
    await enviado.getByRole("button", { name: "Recibir" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Recibido" }).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
