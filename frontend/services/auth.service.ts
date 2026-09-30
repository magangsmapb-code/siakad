import { createClient } from "@/lib/supabase/client";

type AuthInput = { email: string; password: string };

export const authService = {
  async signIn({ email, password }: AuthInput) {
    return createClient().auth.signInWithPassword({ email, password });
  },
  async signUp({ email, password, fullName }: AuthInput & { fullName: string }) {
    const callback = new URL("/auth/callback", window.location.origin);
    return createClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callback.toString(), data: { full_name: fullName } },
    });
  },
  async signInWithProvider(provider: "google" | "facebook") {
    const callback = new URL("/auth/callback", window.location.origin);
    return createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
  },
  async requestPasswordReset(email: string) {
    const redirectTo = new URL("/auth/callback?next=%2Freset-password", window.location.origin).toString();
    return createClient().auth.resetPasswordForEmail(email, { redirectTo });
  },
  async updatePassword(password: string) {
    return createClient().auth.updateUser({ password });
  },
  async signOut() {
    return createClient().auth.signOut();
  },
};