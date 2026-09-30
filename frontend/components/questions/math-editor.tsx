"use client";

import { useDeferredValue, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Textarea } from "@/components/ui/forms";

const snippets = [
  { label: "Pecahan", value: "\\frac{a}{b}" },
  { label: "Pangkat", value: "x^{2}" },
  { label: "Akar", value: "\\sqrt{x}" },
  { label: "Integral", value: "\\int_{a}^{b} f(x)\\,dx" },
  { label: "Turunan", value: "\\frac{dy}{dx}" },
  { label: "Matriks", value: "\\begin{bmatrix}a & b\\\\c & d\\end{bmatrix}" },
  { label: "Persamaan", value: "\\begin{aligned}a &= b \\\\ c &= d\\end{aligned}" },
  { label: "Simbol", value: "\\alpha + \\beta = \\theta" },
];

export function MathEditor({ value, onChange, label = "Pertanyaan", minRows = 5, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  minRows?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const deferredValue = useDeferredValue(value);
  const preview = deferredValue.trim()
    ? katex.renderToString(deferredValue, { throwOnError: false, trust: false, strict: "warn", displayMode: true })
    : "";

  function insertSnippet(snippet: string) {
    const input = inputRef.current;
    if (!input) {
      onChange(`${value}${snippet}`);
      return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  return <div className="space-y-3">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
    <div className="flex flex-wrap gap-1.5" aria-label="Sisipkan rumus matematika">
      {snippets.map((snippet) => <button key={snippet.label} type="button" disabled={disabled} onClick={() => insertSnippet(snippet.value)} className="min-h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300">{snippet.label}</button>)}
    </div>
    <Textarea ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} rows={minRows} maxLength={12000} disabled={disabled} aria-label={`${label} dalam teks dan LaTeX`} placeholder="Tulis soal. Gunakan notasi LaTeX seperti \frac{a}{b} untuk rumus." />
    <div className="min-h-24 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-[#172033]">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pratinjau</p>
      {preview ? <div className="math-preview text-slate-900 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: preview }} /> : <p className="text-sm text-slate-400">Rumus akan tampil di sini.</p>}
    </div>
  </div>;
}