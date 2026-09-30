import { redirect } from "next/navigation";
import { UserRound, ShieldCheck, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dashboardForRole, isUserRole } from "@/lib/auth/roles";
import { ProfileActions } from "@/components/profile/profile-actions";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const dynamic = "force-dynamic";

const roleLabels = { DEVELOPER: "Developer", GURU: "Guru", MURID: "Murid" } as const;

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("email,full_name,role,status,phone").eq("id", user.id).maybeSingle();
  if (error || !profile || !isUserRole(profile.role) || profile.status !== "active") redirect("/verify-email");

  const items = [
    { label: "Nama", value: profile.full_name || "Belum diatur", icon: UserRound },
    { label: "Email", value: profile.email || user.email || "Tidak tersedia", icon: Mail },
    { label: "Peran", value: roleLabels[profile.role], icon: ShieldCheck },
  ];

  return <main className="min-h-dvh bg-slate-50 px-4 py-10 dark:bg-[#0b1220] sm:px-6"><div className="mx-auto max-w-2xl"><div className="flex items-center justify-between"><a href={dashboardForRole[profile.role]} className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">Kembali ke portal</a><ThemeToggle /></div><div className="mt-7 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-700 dark:bg-[#111827]"><p className="text-xs font-semibold tracking-[.14em] text-emerald-700 dark:text-emerald-400">AKUN SIAKAD</p><h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Profil saya</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Informasi akun dan tingkat akses Anda.</p><dl className="mt-7 divide-y divide-slate-200 dark:divide-slate-700">{items.map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-4 py-4"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Icon size={19} /></span><div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-all text-sm font-medium text-slate-800 dark:text-slate-100">{value}</dd></div></div>)}</dl><div className="mt-5"><ProfileActions /></div></div></div></main>;
}