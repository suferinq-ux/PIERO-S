import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refresca la sesión y protege las rutas autenticadas.
 *
 * Rendimiento: usa `getClaims()` (verificación local del JWT con JWKS) en lugar
 * de `getUser()` (que hace una llamada de red a Supabase en cada petición). Si
 * el proyecto usa firmas simétricas, cae a `getUser()`.
 */
export async function updateSession(request: NextRequest) {
  // Modo demo: sin Supabase, se permite el acceso a toda la app.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let isAuthenticated = false;
  try {
    const { data } = await supabase.auth.getClaims();
    isAuthenticated = Boolean(data?.claims?.sub);
  } catch {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthenticated = Boolean(user);
  }

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/recuperar") ||
    pathname.startsWith("/auth");
  const isApi = pathname.startsWith("/api");
  const isPublic = isAuthRoute || isApi;

  if (!isAuthenticated && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
