"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/forms";

export function Modal({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={ref} onClose={() => onOpenChange(false)} aria-labelledby="modal-title" className="w-[min(92vw,560px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700"><h2 id="modal-title" className="text-base font-semibold">{title}</h2><button type="button" aria-label="Tutup dialog" onClick={() => onOpenChange(false)} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button></div><div className="p-5">{children}</div></dialog>;
}

export const Dialog = Modal;

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50"><button aria-label="Tutup panel" onClick={onClose} className="absolute inset-0 bg-slate-950/45" /><section role="dialog" aria-modal="true" aria-label={title} className="absolute inset-y-0 right-0 flex w-[min(90vw,420px)] flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#111827]"><header className="flex min-h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-700"><h2 className="font-semibold">{title}</h2><button type="button" aria-label="Tutup panel" onClick={onClose} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button></header><div className="flex-1 overflow-y-auto p-5">{children}</div></section></div>;
}

export function Dropdown({ label, children }: { label: string; children: React.ReactNode }) {
  return <details className="relative"><summary className="min-h-10 cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">{label}</summary><div className="absolute right-0 z-20 mt-2 min-w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-[#111827]">{children}</div></details>;
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return <span title={label} aria-label={label}>{children}</span>;
}

export function ConfirmDialog({ open, onOpenChange, title, detail, confirmLabel = "Konfirmasi", onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; detail: string; confirmLabel?: string; onConfirm: () => void }) {
  return <Modal open={open} onOpenChange={onOpenChange} title={title}><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{detail}</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => onOpenChange(false)}>Batal</Button><Button variant="danger" onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button></div></Modal>;
}