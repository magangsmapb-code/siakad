import { AlertCircle, Info, TriangleAlert } from "lucide-react";

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "emerald" | "blue" | "amber" | "red" | "slate" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    amber: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    red: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Alert({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" | "error" }) {
  const styles = {
    info: { icon: Info, className: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200" },
    warning: { icon: TriangleAlert, className: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" },
    error: { icon: AlertCircle, className: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" },
  };
  const { icon: Icon, className } = styles[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${className}`}><Icon size={18} className="mt-0.5 shrink-0" />{children}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700"><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{detail}</p></div>;
}

export function ErrorState({ title = "Data tidak dapat dimuat", detail, onRetry }: { title?: string; detail: string; onRetry?: () => void }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-5 dark:border-red-900 dark:bg-red-950/30"><p className="text-sm font-semibold text-red-900 dark:text-red-200">{title}</p><p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-300">{detail}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-red-800 underline dark:text-red-200">Coba lagi</button>}</div>;
}

export function Toast({ children, tone = "success" }: { children: React.ReactNode; tone?: "success" | "error" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`fixed bottom-4 right-4 z-[100] max-w-[min(92vw,380px)] rounded-lg border px-4 py-3 text-sm shadow-lg ${tone === "success" ? "border-emerald-200 bg-white text-slate-800 dark:border-emerald-900 dark:bg-[#111827] dark:text-slate-100" : "border-red-200 bg-white text-red-800 dark:border-red-900 dark:bg-[#111827] dark:text-red-200"}`}>{children}</div>;
}