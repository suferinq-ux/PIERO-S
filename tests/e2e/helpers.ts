import { expect, type Page } from "@playwright/test";

export const TEST_EMAIL = process.env.TEST_USER_EMAIL;
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

/** Indica si hay credenciales de prueba configuradas. */
export function hasCreds(): boolean {
  return Boolean(TEST_EMAIL && TEST_PASSWORD);
}

/**
 * Inicia sesión con el usuario de prueba. Requiere TEST_USER_EMAIL y
 * TEST_USER_PASSWORD en el entorno (idealmente un SUPER_ADMIN con acceso a
 * las dos sucursales del seed).
 */
export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(TEST_EMAIL!);
  await page.getByLabel("Contraseña").fill(TEST_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL("/");
}
