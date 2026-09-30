import { Activity, BookOpen, CalendarCheck, ClipboardCheck, GraduationCap, School, Users } from "lucide-react";
import type { DashboardSummary } from "@/services/dashboard.service";

const icons = [Users, GraduationCap, BookOpen, School, ClipboardCheck, CalendarCheck, Activity];

export function DashboardStats({ summary }: { summary: DashboardSummary }) {
  return <section aria-label="Ringkasan data akademik">
    {summary.hasErrors && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Sebagian data belum dapat dimuat. Periksa koneksi dan kebijakan akses database.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summary.stats.map((stat, index) => {
        const Icon = icons[index % icons.length];
        return <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#111827]">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-600 dark:text-slate-300">{stat.label}</p><p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{stat.value === null ? "—" : stat.value}</p></div><span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Icon size={19} /></span></div>
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{stat.value === null ? "Data belum tersedia" : stat.detail}</p>
        </article>;
      })}
    </div>
    {!summary.hasErrors && summary.stats.every((stat) => stat.value === 0) && <p className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-300">Belum ada data akademik untuk ditampilkan.</p>}
  </section>;
}