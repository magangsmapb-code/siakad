import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { dashboardForRole, isUserRole, type UserRole } from "@/lib/auth/roles";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

const roleForPrefix: Record<string, UserRole> = {
  developer: "DEVELOPER",
  teacher: "GURU",
  student: "MURID",
};

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("error", "auth-unconfigured");
    return NextResponse.redirect(login);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const protectedPrefix = request.nextUrl.pathname.split("/")[1];
  const requiredRole = roleForPrefix[protectedPrefix];

  if (!user && requiredRole) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (user && requiredRole) {
    const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
    if (!profile || !isUserRole(profile.role) || profile.status !== "active" || profile.role !== requiredRole) {
      const destination = !profile || !isUserRole(profile.role) || profile.status !== "active"
        ? "/login"
        : dashboardForRole[profile.role];
      if (destination === request.nextUrl.pathname) return response;
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/developer/:path*", "/teacher/:path*", "/student/:path*"],
};