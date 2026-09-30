import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { dashboardService } from "@/services/dashboard.service";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const summary = await dashboardService.getSummary(user.id, "MURID");
  return <DashboardShell role="MURID"><div className="mb-7"><p className="mb-2 text-xs font-semibold tracking-[.14em] text-emerald-700 dark:text-emerald-400">RUANG BELAJAR MURID</p><h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">Ringkasan belajar</h1><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Nilai, kehadiran, dan aktivitas ujian pada akun Anda.</p></div><DashboardStats summary={summary} /></DashboardShell>;
}