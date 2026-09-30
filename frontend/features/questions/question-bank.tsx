"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Archive, Download, Eye, FileUp, Pencil, Plus, RefreshCw, Search, Copy, Trash2 } from "lucide-react";
import { Alert, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Button, Checkbox, Input, Select } from "@/components/ui/forms";
import { ConfirmDialog, Modal } from "@/components/ui/overlays";
import { Pagination } from "@/components/ui/navigation";
import { MathEditor } from "@/components/questions/math-editor";
import { QuestionForm } from "@/features/questions/question-form";
import { questionService, type QuestionRecord } from "@/services/question.service";

type OptionRecord = { id: string; name: string; code?: string };
type Meta = { page?: number; page_size?: number; total?: number | null; pages?: number };

export function QuestionBank() {
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, pages: 0 });
  const [subjects, setSubjects] = useState<OptionRecord[]>([]);
  const [classes, setClasses] = useState<OptionRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ page: 1, pageSize: 15, search: "", subjectId: "", classId: "", difficulty: "", questionType: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formQuestion, setFormQuestion] = useState<QuestionRecord | null | undefined>(undefined);
  const [preview, setPreview] = useState<QuestionRecord | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string[] | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    void questionService.list(filters).then((result) => {
      if (!active) return;
      setQuestions(result.data ?? []);
      setMeta((result.meta ?? {}) as Meta);
      setError("");
      setSelectedIds([]);
      setLoading(false);
    }).catch((caught) => {
      if (!active) return;
      setError(caught instanceof Error ? caught.message : "Bank soal tidak dapat dimuat.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [filters, refreshKey]);

  useEffect(() => {
    let active = true;
    void Promise.all([questionService.listSubjects(), questionService.listClasses()]).then(([subjectResult, classResult]) => {
      if (!active) return;
      setSubjects(subjectResult.data ?? []);
      setClasses(classResult.data ?? []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function updateFilters(values: Partial<typeof filters>) {
    setLoading(true);
    setFilters((current) => ({ ...current, ...values }));
  }

  function refresh() {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  async function archive(ids: string[]) {
    setWorking(true);
    try {
      if (ids.length === 1) await questionService.archive(ids[0]);
      else await questionService.archiveMany(ids);
      setNotice(`${ids.length} soal diarsipkan.`);
      setConfirmArchive(null);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Soal tidak dapat diarsipkan.");
    } finally {
      setWorking(false);
    }
  }

  async function duplicate(id: string) {
    setWorking(true);
    try {
      const result = await questionService.duplicate(id);
      setNotice(result.data ? "Salinan soal tersimpan sebagai draft." : "Soal tidak berhasil disalin.");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Soal tidak dapat disalin.");
    } finally {
      setWorking(false);
    }
  }

  async function exportCsv() {
    setWorking(true);
    try {
      const blob = await questionService.exportCsv();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "question-bank.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bank soal tidak dapat diekspor.");
    } finally {
      setWorking(false);
    }
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File JSON maksimal 2 MB.");
      return;
    }
    setWorking(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const records = Array.isArray(parsed) ? parsed : typeof parsed === "object" && parsed !== null && "questions" in parsed ? (parsed as { questions: unknown }).questions : null;
      if (!Array.isArray(records) || records.length === 0 || records.length > 100) throw new Error("JSON harus berisi array 1-100 soal.");
      const result = await questionService.importMany(records as Parameters<typeof questionService.importMany>[0]);
      setNotice(`${result.data?.length ?? 0} soal diimpor sebagai draft.`);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "File JSON tidak valid.");
    } finally {
      setWorking(false);
    }
  }

  const allPageSelected = questions.length > 0 && questions.every((question) => selectedIds.includes(question.id));
  const pageCount = Math.max(1, meta.pages ?? 0);

  return <div className="space-y-5">
    {notice && <Alert tone="info">{notice}<button type="button" onClick={() => setNotice("")} className="ml-2 font-semibold underline">Tutup</button></Alert>}
    {error && <ErrorState detail={error} onRetry={refresh} />}
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#111827] lg:flex-row lg:items-end">
      <form onSubmit={(event) => { event.preventDefault(); updateFilters({ search: searchInput, page: 1 }); }} className="flex min-w-0 flex-1 gap-2"><label className="sr-only" htmlFor="question-search">Cari soal</label><div className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><Input id="question-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari soal, bab, atau topik" className="pl-9" /></div><Button type="submit" variant="secondary">Cari</Button></form>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
        <Select aria-label="Filter mata pelajaran" value={filters.subjectId} onChange={(event) => updateFilters({ subjectId: event.target.value, page: 1 })}><option value="">Semua mapel</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select>
        <Select aria-label="Filter kelas" value={filters.classId} onChange={(event) => updateFilters({ classId: event.target.value, page: 1 })}><option value="">Semua kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        <Select aria-label="Filter tipe soal" value={filters.questionType} onChange={(event) => updateFilters({ questionType: event.target.value, page: 1 })}><option value="">Semua tipe</option><option value="multiple_choice">Pilihan ganda</option><option value="true_false">Benar / salah</option><option value="short_answer">Isian</option><option value="essay">Esai</option></Select>
        <Select aria-label="Filter kesulitan" value={filters.difficulty} onChange={(event) => updateFilters({ difficulty: event.target.value, page: 1 })}><option value="">Semua tingkat</option><option value="easy">Mudah</option><option value="medium">Sedang</option><option value="hard">Sulit</option></Select>
      </div>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2"><Button onClick={() => setFormQuestion(null)}><Plus size={17} />Buat soal</Button><Button variant="secondary" onClick={() => void exportCsv()} disabled={working}><Download size={16} />Ekspor CSV</Button><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"><FileUp size={16} />Impor JSON<input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void importJson(event)} /></label>{selectedIds.length > 0 && <Button variant="danger" onClick={() => setConfirmArchive(selectedIds)}><Archive size={16} />Arsipkan ({selectedIds.length})</Button>}</div>
      <Button variant="ghost" aria-label="Muat ulang bank soal" onClick={refresh}><RefreshCw size={17} /></Button>
    </div>
    {loading ? <div className="space-y-3"><Skeleton className="h-12 w-full" />{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-20 w-full rounded-lg" />)}</div> : questions.length === 0 ? <EmptyState title="Belum ada soal" detail="Buat soal baru atau impor file JSON tervalidasi untuk kelas yang Anda ajar." /> : <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="w-10 px-4 py-3"><Checkbox aria-label="Pilih semua soal halaman ini" checked={allPageSelected} onChange={(event) => setSelectedIds(event.target.checked ? questions.map((question) => question.id) : [])} /></th><th className="px-4 py-3">Pertanyaan</th><th className="px-4 py-3">Tipe</th><th className="px-4 py-3">Tingkat</th><th className="px-4 py-3">Status</th><th className="w-44 px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-[#111827]">{questions.map((question) => <tr key={question.id} className="text-slate-700 dark:text-slate-200"><td className="px-4 py-3 align-top"><Checkbox aria-label={`Pilih ${question.prompt.slice(0, 40)}`} checked={selectedIds.includes(question.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, question.id] : ids.filter((id) => id !== question.id))} /></td><td className="max-w-[420px] px-4 py-3"><button type="button" onClick={() => setPreview(question)} className="line-clamp-2 text-left font-medium text-slate-900 hover:text-emerald-800 dark:text-slate-100 dark:hover:text-emerald-300">{question.prompt}</button><p className="mt-1 text-xs text-slate-500">{question.chapter || "Tanpa bab"}{question.topic ? ` · ${question.topic}` : ""} · {question.default_points} poin</p></td><td className="px-4 py-3">{question.question_type.replaceAll("_", " ")}</td><td className="px-4 py-3">{question.difficulty}</td><td className="px-4 py-3">{question.status}</td><td className="px-4 py-3"><div className="flex items-center gap-1"><button title="Pratinjau" aria-label="Pratinjau soal" onClick={() => setPreview(question)} className="grid size-9 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"><Eye size={16} /></button><button title="Edit" aria-label="Edit soal" onClick={() => setFormQuestion(question)} className="grid size-9 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={16} /></button><button title="Duplikasi" aria-label="Duplikasi soal" disabled={working} onClick={() => void duplicate(question.id)} className="grid size-9 place-items-center rounded-md hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"><Copy size={16} /></button><button title="Arsipkan" aria-label="Arsipkan soal" onClick={() => setConfirmArchive([question.id])} className="grid size-9 place-items-center rounded-md text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>
    </div>}
    <Pagination page={filters.page} pageCount={pageCount} onPageChange={(page) => updateFilters({ page })} />
    {formQuestion !== undefined && <QuestionForm question={formQuestion} onClose={() => setFormQuestion(undefined)} onSaved={refresh} />}
    <ConfirmDialog open={Boolean(confirmArchive)} onOpenChange={(open) => { if (!open) setConfirmArchive(null); }} title="Arsipkan soal" detail={`Soal akan diarsipkan dan tidak dihapus dari histori. Jumlah soal: ${confirmArchive?.length ?? 0}.`} confirmLabel="Arsipkan" onConfirm={() => { if (confirmArchive) void archive(confirmArchive); }} />
    <Modal open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }} title="Pratinjau soal">{preview && <div className="space-y-4"><p className="text-xs text-slate-500">{preview.chapter || "Tanpa bab"} · {preview.question_type.replaceAll("_", " ")} · {preview.difficulty} · {preview.default_points} poin</p><MathEditor label="Pertanyaan" value={preview.prompt} onChange={() => undefined} disabled /><ul className="space-y-2">{preview.options.map((option, index) => <li key={`${preview.id}-${index}`} className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">{option}{option === preview.correct_answer && <span className="ml-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Jawaban benar</span>}</li>)}</ul>{preview.explanation && <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 dark:bg-slate-800">{preview.explanation}</p>}{preview.image_path && <QuestionImage imagePath={preview.image_path} />}</div>}</Modal>
  </div>;
}

function QuestionImage({ imagePath }: { imagePath: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    void questionService.previewImage(imagePath).then((result) => { if (active) setUrl(result.data?.signed_url ?? ""); }).catch(() => { if (active) setUrl(""); });
    return () => { active = false; };
  }, [imagePath]);
  return url ? <Image src={url} alt="Gambar dalam soal" width={640} height={480} unoptimized className="max-h-64 rounded-lg object-contain" /> : <p className="text-xs text-slate-500">Pratinjau gambar tidak tersedia.</p>;
}