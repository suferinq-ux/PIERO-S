/** Resultado estándar de las operaciones de autenticación. */
export interface AuthResult {
  error: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Puerto de acceso a datos de autenticación (patrón Repository + Adapter).
 * Desacopla la lógica de negocio del proveedor concreto (Supabase).
 */
export interface AuthRepository {
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  recoverPassword(email: string): Promise<AuthResult>;
  getSessionUser(): Promise<AuthUser | null>;
}
