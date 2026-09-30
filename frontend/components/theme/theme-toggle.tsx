"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { dark, toggleTheme } = useTheme();
  return <button type="button" aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"} title={dark ? "Mode terang" : "Mode gelap"} onClick={toggleTheme} className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>;
}