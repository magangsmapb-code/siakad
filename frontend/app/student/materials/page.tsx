import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MaterialLibrary } from "@/features/materials/material-library";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentMaterialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <DashboardShell role="MURID"><div className="mb-7"><p className="mb-2 text-xs font-semibold tracking-[.14em] text-blue-700 dark:text-blue-300">RUANG BELAJAR</p><h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">Materi kelas</h1><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Bahan belajar yang dibagikan guru untuk kelas Anda.</p></div><MaterialLibrary canManage={false} /></DashboardShell>;
}