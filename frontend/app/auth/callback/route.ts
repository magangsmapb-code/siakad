import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dashboardForRole, isUserRole } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  const supabase = await createClient();
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (next === "/reset-password") return NextResponse.redirect(new URL(next, request.url));

  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (!profile || !isUserRole(profile.role)) return NextResponse.redirect(new URL("/verify-email", request.url));
  if (profile.status !== "active") return NextResponse.redirect(new URL("/login?error=inactive", request.url));
  return NextResponse.redirect(new URL(dashboardForRole[profile.role], request.url));
}