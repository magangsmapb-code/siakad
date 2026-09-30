import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QuestionBank } from "@/features/questions/question-bank";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherQuestionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <DashboardShell role="GURU"><div className="mb-7"><p className="mb-2 text-xs font-semibold tracking-[.14em] text-emerald-700 dark:text-emerald-400">PERANGKAT PEMBELAJARAN</p><h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">Bank soal</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Susun soal per mata pelajaran, kelas, bab, dan tingkat kesulitan.</p></div><QuestionBank /></DashboardShell>;
}