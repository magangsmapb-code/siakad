"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Archive, Download, FileText, Plus, RefreshCw, Search, Upload } from "lucide-react";
import { Alert, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Button, Input, Select, Textarea } from "@/components/ui/forms";
import { ConfirmDialog, Modal } from "@/components/ui/overlays";
import { Pagination } from "@/components/ui/navigation";
import { formatDateTime } from "@/utils/format-date";
import { materialService, type MaterialRecord } from "@/services/material.service";

type OptionRecord = { id: string; name: string; code?: string };
type MaterialMeta = { pages?: number; total?: number | null };

const supportedFiles = ".pdf,.docx,.txt,.jpg,.jpeg,.png";
const maxFileBytes = 25 * 1024 * 1024;

export function MaterialLibrary({ canManage }: { canManage: boolean }) {
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [meta, setMeta] = useState<MaterialMeta>({ pages: 0 });
  const [classes, setClasses] = useState<OptionRecord[]>([]);
  const [subjects, setSubjects] = useState<OptionRecord[]>([]);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [materialStatus, setMaterialStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<MaterialRecord | null>(null);
  const [uploadClass, setUploadClass] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    void materialService.list(page, search, classId, subjectId, materialStatus).then((result) => {
      if (!active) return;
      setMaterials(result.data ?? []);
      setMeta((result.meta ?? {}) as MaterialMeta);
      setError("");
      setLoading(false);
    }).catch((caught) => {
      if (!active) return;
      setError(caught instanceof Error ? caught.message : "Materi tidak dapat dimuat.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [page, search, classId, subjectId, materialStatus, refreshKey]);

  useEffect(() => {
    let active = true;
    void Promise.all([materialService.listClasses(), materialService.listSubjects()]).then(([classResult, subjectResult]) => {
      if (!active) return;
      setClasses(classResult.data ?? []);
      setSubjects(subjectResult.data ?? []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function refresh() {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  async function saveUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile) {
      setError("Pilih file materi terlebih dahulu.");
      return;
    }
    if (uploadFile.size > maxFileBytes) {
      setError("Ukuran file maksimal 25 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await materialService.upload(uploadClass, uploadTitle, uploadDescription, uploadSubject, uploadFile);
      if (!result.data) throw new Error(result.error?.message ?? "Materi gagal disimpan.");
      setNotice("Materi berhasil diunggah sebagai draft.");
      setUploadOpen(false);
      setUploadClass("");
      setUploadSubject("");
      setUploadTitle("");
      setUploadDescription("");
      setUploadFile(null);
      setPage(1);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Materi gagal diunggah.");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(material: MaterialRecord, action: "publish" | "unpublish" | "archive") {
    setBusy(true);
    setError("");
    try {
      if (action === "publish") await materialService.publish(material.id);
      if (action === "unpublish") await materialService.unpublish(material.id);
      if (action === "archive") await materialService.archive(material.id);
      setNotice(action === "publish" ? "Materi dipublikasikan." : action === "unpublish" ? "Materi kembali menjadi draft." : "Materi diarsipkan.");
      setArchiveTarget(null);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Perubahan materi gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function openDownload(material: MaterialRecord) {
    setBusy(true);
    setError("");
    try {
      const result = await materialService.download(material.id);
      if (!result.data?.signed_url) throw new Error(result.error?.message ?? "Link file tidak tersedia.");
      const anchor = document.createElement("a");
      anchor.href = result.data.signed_url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.download = material.file_name ?? material.title;
      anchor.click();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "File tidak dapat dibuka.");
    } finally {
      setBusy(false);
    }
  }

  const pages = Math.max(1, meta.pages ?? 0);

  return <div className="space-y-5">
    {notice && <Alert tone="info">{notice}<button type="button" onClick={() => setNotice("")} className="ml-2 font-semibold underline">Tutup</button></Alert>}
    {error && <ErrorState detail={error} onRetry={refresh} />}
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#111827] lg:flex-row lg:items-end">
      <form onSubmit={(event) => { event.preventDefault(); setLoading(true); setPage(1); setSearch(searchInput); }} className="flex min-w-0 flex-1 gap-2"><label className="sr-only" htmlFor="material-search">Cari materi</label><div className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><Input id="material-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari judul, deskripsi, file" className="pl-9" /></div><Button type="submit" variant="secondary">Cari</Button></form>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Select aria-label="Filter kelas" value={classId} onChange={(event) => { setLoading(true); setClassId(event.target.value); setPage(1); }}><option value="">Semua kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select aria-label="Filter mata pelajaran" value={subjectId} onChange={(event) => { setLoading(true); setSubjectId(event.target.value); setPage(1); }}><option value="">Semua mapel</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select aria-label="Filter status" value={materialStatus} onChange={(event) => { setLoading(true); setMaterialStatus(event.target.value); setPage(1); }}><option value="">Semua status</option>{canManage && <option value="draft">Draft</option>}<option value="published">Dipublikasikan</option>{canManage && <option value="archived">Diarsipkan</option>}</Select></div>
    </section>
    {canManage && <div className="flex justify-end"><Button onClick={() => setUploadOpen(true)}><Plus size={17} />Unggah materi</Button></div>}
    {loading ? <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-40 rounded-xl" />)}</section> : materials.length === 0 ? <EmptyState title="Belum ada materi" detail={canManage ? "Unggah bahan ajar untuk kelas yang Anda kelola." : "Materi yang diterbitkan guru akan tampil di sini."} /> : <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{materials.map((material) => <article key={material.id} className="flex min-h-48 flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#111827]"><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><FileText size={19} /></span><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${material.status === "published" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{material.status === "published" ? "Dipublikasikan" : material.status === "draft" ? "Draft" : "Diarsipkan"}</span></div><h2 className="mt-4 line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-100">{material.title}</h2><p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{material.description || material.file_name || "Bahan ajar"}</p><p className="mt-3 text-xs text-slate-400">{material.file_name ?? "Tautan materi"}{material.file_size_bytes ? ` · ${(material.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : ""} · {formatDateTime(material.created_at)}</p><div className="mt-auto flex flex-wrap items-center gap-2 pt-4">{material.storage_path && material.status !== "archived" && <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => void openDownload(material)} disabled={busy}><Download size={15} />Buka file</Button>}{canManage && material.status !== "archived" && <>{material.status === "published" ? <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => void runAction(material, "unpublish")} disabled={busy}>Tarik</Button> : <Button className="min-h-9 px-3 text-xs" onClick={() => void runAction(material, "publish")} disabled={busy}>Terbitkan</Button>}<Button variant="ghost" aria-label="Arsipkan materi" title="Arsipkan" className="min-h-9 px-2 text-red-700 dark:text-red-300" onClick={() => setArchiveTarget(material)} disabled={busy}><Archive size={16} /></Button></>}</div></article>)}</section>}
    <Pagination page={page} pageCount={pages} onPageChange={(value) => { setLoading(true); setPage(value); }} />
    <Button variant="ghost" aria-label="Muat ulang materi" onClick={refresh} className="sr-only"><RefreshCw size={16} /></Button>
    <Modal open={uploadOpen} onOpenChange={(open) => { if (!open) setUploadOpen(false); }} title="Unggah materi">
      <form onSubmit={(event) => void saveUpload(event)} className="space-y-4">
        <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Kelas<Select required value={uploadClass} onChange={(event) => setUploadClass(event.target.value)}><option value="">Pilih kelas yang diampu</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Mata pelajaran<Select value={uploadSubject} onChange={(event) => setUploadSubject(event.target.value)}><option value="">Tanpa mata pelajaran spesifik</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Judul<Input required minLength={2} maxLength={160} value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Keterangan<Textarea maxLength={4000} value={uploadDescription} onChange={(event) => setUploadDescription(event.target.value)} /></label>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">File (PDF, DOCX, TXT, JPG, PNG)<Input required type="file" accept={supportedFiles} onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /></label>
        <p className="text-xs text-slate-500">Maksimum 25 MB. File tetap privat dan hanya dibagikan saat materi diterbitkan.</p>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700"><Button type="button" variant="secondary" onClick={() => setUploadOpen(false)}>Batal</Button><Button type="submit" disabled={busy || classes.length === 0}>{busy ? "Mengunggah..." : <><Upload size={16} />Unggah sebagai draft</>}</Button></div>
      </form>
    </Modal>
    <ConfirmDialog open={Boolean(archiveTarget)} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }} title="Arsipkan materi" detail={`Materi “${archiveTarget?.title ?? ""}” akan diarsipkan dan file privat dihapus.`} confirmLabel="Arsipkan" onConfirm={() => { if (archiveTarget) void runAction(archiveTarget, "archive"); }} />
  </div>;
}