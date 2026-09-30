"use client";

import { useState } from "react";
import { Button } from "@/components/ui/forms";

export type TabItem = { id: string; label: string; content: React.ReactNode };

export function Tabs({ items, initialTab }: { items: TabItem[]; initialTab?: string }) {
  const [active, setActive] = useState(initialTab ?? items[0]?.id ?? "");
  const selected = items.find((item) => item.id === active);
  return <div><div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">{items.map((item) => <button key={item.id} type="button" role="tab" aria-selected={active === item.id} onClick={() => setActive(item.id)} className={`min-h-11 shrink-0 border-b-2 px-3 text-sm ${active === item.id ? "border-emerald-700 font-semibold text-emerald-800 dark:border-emerald-400 dark:text-emerald-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{item.label}</button>)}</div><div role="tabpanel" className="pt-4">{selected?.content}</div></div>;
}

export function Pagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  const safePageCount = Math.max(1, pageCount);
  return <nav aria-label="Pagination" className="flex items-center justify-between gap-3"><span className="text-sm text-slate-500">Halaman {page} dari {safePageCount}</span><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Sebelumnya</Button><Button variant="secondary" disabled={page >= safePageCount} onClick={() => onPageChange(page + 1)}>Berikutnya</Button></div></nav>;
}