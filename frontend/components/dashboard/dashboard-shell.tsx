"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/auth/roles";
import { authService } from "@/services/auth.service";
import { useTheme } from "@/hooks/use-theme";
import { notificationService, type NotificationItem } from "@/services/notification.service";
import { formatDateTime } from "@/utils/format-date";

type NavigationItem = { label: string; href: string; icon: LucideIcon };

const navigation: Record<UserRole, NavigationItem[]> = {
  DEVELOPER: [
    { label: "Panel administrasi", href: "/developer/dashboard", icon: LayoutDashboard },
    { label: "Profil", href: "/profile", icon: UserRound },
  ],
  GURU: [
    { label: "Ruang pembelajaran", href: "/teacher/dashboard", icon: LayoutDashboard },
    { label: "Materi", href: "/teacher/materials", icon: BookOpen },
    { label: "Bank soal", href: "/teacher/questions", icon: BookOpen },
    { label: "Profil", href: "/profile", icon: UserRound },
  ],
  MURID: [
    { label: "Ruang belajar", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "Materi", href: "/student/materials", icon: BookOpen },
    { label: "Profil", href: "/profile", icon: UserRound },
  ],
};

const roleLabel: Record<UserRole, string> = {
  DEVELOPER: "Developer",
  GURU: "Guru",
  MURID: "Murid",
};

export function DashboardShell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationError, setNotificationError] = useState(false);
  const { dark, toggleTheme } = useTheme();

  useEffect(() => {
    let active = true;
    void notificationService.listRecent().then(({ data, error }) => {
      if (!active) return;
      setNotificationError(Boolean(error));
      setNotifications(data ?? []);
    });
    return () => { active = false; };
  }, []);

  async function signOut() {
    await authService.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function markRead(id: string) {
    const { error } = await notificationService.markRead(id);
    if (!error) setNotifications((items) => items.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
  }

  const links = navigation[role];
  const dashboardPath = role === "DEVELOPER" ? "/developer/dashboard" : role === "GURU" ? "/teacher/dashboard" : "/student/dashboard";
  const sidebar = (
    <>
      <Link href={dashboardPath} className="flex h-[76px] items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-700">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-700 text-white"><GraduationCap size={21} /></span>
        <span className="min-w-0"><span className="block truncate text-xs font-semibold tracking-wide text-slate-900 dark:text-slate-100">SMA PEMBERDAYAAN BANGSA</span><span className="mt-1 block text-xs text-slate-500">Portal akademik</span></span>
      </Link>
      <div className="px-4 py-5">
        <p className="px-3 pb-3 text-[10px] font-semibold tracking-[.14em] text-slate-400">MENU UTAMA</p>
        <nav aria-label="Navigasi utama" className="space-y-1">
          {links.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return <Link key={href} href={href} onClick={() => setDrawerOpen(false)} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${active ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}><Icon size={18} strokeWidth={1.8} />{label}</Link>;
          })}
        </nav>
      </div>
      <div className="mt-auto border-t border-slate-200 p-4 dark:border-slate-700">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><span className="grid size-9 place-items-center rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"><ShieldCheck size={18} /></span><span><span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Akses {roleLabel[role]}</span><span className="block text-xs text-slate-500">Akun terverifikasi</span></span></div>
        <button type="button" onClick={() => void signOut()} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><LogOut size={17} />Keluar</button>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800 dark:bg-[#0b1220] dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-[#111827] lg:flex">{sidebar}</aside>
      {drawerOpen && <button aria-label="Tutup navigasi" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setDrawerOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-700 dark:bg-[#111827] lg:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="absolute right-3 top-5"><button aria-label="Tutup navigasi" onClick={() => setDrawerOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button></div>{sidebar}
      </aside>
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7 dark:border-slate-700 dark:bg-[#111827]/95">
          <div className="flex items-center gap-3"><button aria-label="Buka navigasi" onClick={() => setDrawerOpen(true)} className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"><Menu size={20} /></button><div><p className="text-xs text-slate-500">Portal akademik <span className="px-1">/</span> {roleLabel[role]}</p><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">SMA Pemberdayaan Bangsa</p></div></div>
          <div className="flex items-center gap-1"><button type="button" aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"} title={dark ? "Mode terang" : "Mode gelap"} onClick={toggleTheme} className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <details className="relative"><summary aria-label="Notifikasi" className="relative grid size-10 cursor-pointer list-none place-items-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Bell size={19} />{notifications.some((item) => !item.read_at) && <span className="absolute right-2 top-2 size-2 rounded-full bg-red-600" />}</summary><section aria-label="Notifikasi terbaru" className="absolute right-0 z-30 mt-2 w-[min(88vw,360px)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-[#111827]"><h2 className="text-sm font-semibold">Notifikasi</h2>{notificationError ? <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">Notifikasi tidak dapat dimuat.</p> : notifications.length === 0 ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Belum ada notifikasi.</p> : <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">{notifications.map((item) => <li key={item.id} className="py-3 first:pt-0 last:pb-0"><button type="button" onClick={() => void markRead(item.id)} className="w-full text-left"><span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">{item.title}{!item.read_at && <span className="size-1.5 rounded-full bg-emerald-600" />}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.body}</span><time dateTime={item.created_at} className="mt-1 block text-[11px] text-slate-400">{formatDateTime(item.created_at)}</time></button></li>)}</ul>}</section></details>
            <span className="ml-2 hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" /><details className="relative ml-1"><summary aria-label="Menu profil" className="grid size-10 cursor-pointer list-none place-items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><UserRound size={18} /></summary><section className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-[#111827]"><Link href="/profile" className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Profil saya</Link><button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"><LogOut size={16} />Keluar</button></section></details></div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-7 lg:p-9">{children}</main>
      </div>
    </div>
  );
}