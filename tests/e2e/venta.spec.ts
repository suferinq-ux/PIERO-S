import { expect, test } from "@playwright/test";
import { hasCreds, login } from "./helpers";

test.describe("POS — registrar venta", () => {
  test.skip(!hasCreds(), "Requiere TEST_USER_EMAIL y TEST_USER_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("registra una venta en efectivo y muestra el ticket", async ({ page }) => {
    await page.goto("/pos");

    // Elige un producto sin variantes (los que tienen variantes muestran el badge).
    const product = page
      .locator('[data-testid="pos-product"]')
      .filter({ hasNotText: "Variantes" })
      .first();
    await expect(product).toBeVisible();
    await product.click();

    // Abre el carrito y paga en efectivo el total.
    await page.locator('[data-testid="pos-cart"]').click();
    await page.getByRole("button", { name: "Efectivo", exact: true }).click();
    await page.locator('[data-testid="pos-cobrar"]').click();

    // El ticket se muestra tras la venta.
    await expect(page.getByText("Gracias por su compra")).toBeVisible({ timeout: 15000 });
  });
});
