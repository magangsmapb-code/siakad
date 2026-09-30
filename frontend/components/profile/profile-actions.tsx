"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authService } from "@/services/auth.service";

export function ProfileActions() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function signOut() {
    setBusy(true);
    const { error } = await authService.signOut();
    if (error) {
      setBusy(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return <button type="button" disabled={busy} onClick={() => void signOut()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"><LogOut size={17} />{busy ? "Keluar..." : "Keluar"}</button>;
}