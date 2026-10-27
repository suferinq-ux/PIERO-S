import { expect, test } from "@playwright/test";
import { hasCreds, login } from "./helpers";

test.describe("Caja — apertura, movimiento y cierre", () => {
  test.skip(!hasCreds(), "Requiere TEST_USER_EMAIL y TEST_USER_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("abre, registra un ingreso y cierra con arqueo", async ({ page }) => {
    await page.goto("/caja");

    // Abre caja solo si no hay una abierta.
    const abrir = page.getByRole("button", { name: "Abrir caja" });
    if (await abrir.isVisible().catch(() => false)) {
      await abrir.click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Monto inicial (S/)").fill("100");
      await dialog.getByRole("button", { name: "Abrir", exact: true }).click();
      await expect(page.getByText("Caja abierta")).toBeVisible();
    }

    // Registra un ingreso.
    await page.getByRole("button", { name: "Ingreso" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Monto (S/)").fill("20");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Movimiento registrado")).toBeVisible();

    // Cierra la caja con un monto real.
    await page.getByRole("button", { name: "Cerrar caja" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Monto real (S/)").fill("120");
    await dialog.getByRole("button", { name: "Cerrar caja" }).click();

    await expect(page.getByText("Arqueo de caja")).toBeVisible({ timeout: 15000 });
  });
});
