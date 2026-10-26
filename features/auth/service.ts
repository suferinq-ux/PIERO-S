import type { AuthRepository } from "./types";

/**
 * Casos de uso de autenticación. Recibe el repositorio (adapter) por
 * inyección de dependencias; no conoce la implementación concreta.
 */
export function createAuthService(repository: AuthRepository) {
  return {
    login: (email: string, password: string) => repository.signIn(email, password),
    logout: () => repository.signOut(),
    recoverPassword: (email: string) => repository.recoverPassword(email),
    currentUser: () => repository.getSessionUser(),
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
