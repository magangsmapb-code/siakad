"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Button, Input, Select, Textarea } from "@/components/ui/forms";
import { Modal } from "@/components/ui/overlays";
import { MathEditor } from "@/components/questions/math-editor";
import { questionService, type Difficulty, type QuestionInput, type QuestionRecord, type QuestionType } from "@/services/question.service";

type OptionRecord = { id: string; name: string; code?: string };

export function QuestionForm({ question, onClose, onSaved }: { question: QuestionRecord | null; onClose: () => void; onSaved: () => void }) {
  const [subjects, setSubjects] = useState<OptionRecord[]>([]);
  const [classes, setClasses] = useState<OptionRecord[]>([]);
  const [formError, setFormError] = useState("");
  const [optionLoadError, setOptionLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subjectId, setSubjectId] = useState(question?.subject_id ?? "");
  const [classId, setClassId] = useState(question?.class_id ?? "");
  const [chapter, setChapter] = useState(question?.chapter ?? "");
  const [topic, setTopic] = useState(question?.topic ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(question?.difficulty ?? "medium");
  const [questionType, setQuestionType] = useState<QuestionType>(question?.question_type ?? "multiple_choice");
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [options, setOptions] = useState(question?.options.join("\n") ?? "");
  const [correctAnswer, setCorrectAnswer] = useState(String(question?.correct_answer ?? ""));
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [points, setPoints] = useState(String(question?.default_points ?? 1));
  const [imagePath, setImagePath] = useState(question?.image_path ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    let current = true;
    void Promise.all([questionService.listSubjects(), questionService.listClasses()]).then(([subjectResult, classResult]) => {
      if (!current) return;
      if (subjectResult.data) setSubjects(subjectResult.data);
      if (classResult.data) setClasses(classResult.data);
      setOptionLoadError(Boolean(subjectResult.error || classResult.error));
    }).catch(() => {
      if (current) setOptionLoadError(true);
    });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!question?.image_path) return;
    let current = true;
    void questionService.previewImage(question.image_path).then((result) => {
      if (current && result.data) setImagePreview(result.data.signed_url);
    }).catch(() => {
      if (current) setImagePreview("");
    });
    return () => { current = false; };
  }, [question?.image_path]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      let savedImagePath = imagePath || null;
      if (imageFile) {
        const uploaded = await questionService.uploadImage(imageFile);
        if (!uploaded.data) throw new Error(uploaded.error?.message ?? "Gambar gagal diunggah.");
        savedImagePath = uploaded.data.image_path;
      }
      const parsedOptions = questionType === "multiple_choice" ? options.split("\n").map((item) => item.trim()).filter(Boolean) : [];
      const input: QuestionInput = {
        subject_id: subjectId,
        class_id: classId || null,
        chapter: chapter.trim() || null,
        topic: topic.trim() || null,
        difficulty,
        question_type: questionType,
        question: prompt.trim(),
        options: parsedOptions,
        correct_answer: questionType === "essay" || !correctAnswer.trim() ? null : correctAnswer.trim(),
        explanation: explanation.trim() || null,
        image_path: savedImagePath,
        points: Number(points),
      };
      const saved = question ? await questionService.update(question.id, input) : await questionService.create(input);
      if (!saved.data) throw new Error(saved.error?.message ?? "Soal gagal disimpan.");
      onSaved();
      onClose();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Soal tidak dapat disimpan.");
    } finally {
      setBusy(false);
    }
  }

  function chooseImage(file: File | undefined) {
    if (!file) return;
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  return <Modal open onOpenChange={(open) => { if (!open) onClose(); }} title={question ? "Edit soal" : "Buat soal"}>
    <form onSubmit={(event) => void submit(event)} className="max-h-[min(78vh,760px)] space-y-5 overflow-y-auto pr-1">
      {optionLoadError && <Alert tone="warning">Daftar mata pelajaran atau kelas tidak berhasil dimuat. Periksa koneksi dan akses akun.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Mata pelajaran<Select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Pilih mata pelajaran</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code ? `${subject.code} · ` : ""}{subject.name}</option>)}</Select></label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Kelas<Select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Semua kelas yang diampu</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Bab<Input value={chapter} onChange={(event) => setChapter(event.target.value)} maxLength={160} placeholder="Contoh: Persamaan" /></label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Topik<Input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={200} placeholder="Contoh: Persamaan linear" /></label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Tipe soal<Select value={questionType} onChange={(event) => setQuestionType(event.target.value as QuestionType)}><option value="multiple_choice">Pilihan ganda</option><option value="true_false">Benar / salah</option><option value="short_answer">Isian</option><option value="essay">Esai</option></Select></label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Kesulitan<Select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><option value="easy">Mudah</option><option value="medium">Sedang</option><option value="hard">Sulit</option></Select></label>
      </div>
      <MathEditor label="Pertanyaan" value={prompt} onChange={setPrompt} minRows={5} />
      {questionType === "multiple_choice" && <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Pilihan jawaban, satu per baris<Textarea required value={options} onChange={(event) => setOptions(event.target.value)} rows={4} placeholder={"Pilihan A\nPilihan B\nPilihan C"} /></label>}
      {questionType !== "essay" && <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Jawaban benar<Input required={questionType !== "short_answer" ? true : false} value={correctAnswer} onChange={(event) => setCorrectAnswer(event.target.value)} placeholder={questionType === "true_false" ? "true / false" : "Jawaban"} /></label>}
      <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Pembahasan<Textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={3} maxLength={12000} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Poin<Input type="number" min="0.01" max="1000" step="0.01" required value={points} onChange={(event) => setPoints(event.target.value)} /></label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Gambar soal<span className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600"><ImagePlus size={17} /><input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => chooseImage(event.target.files?.[0])} className="min-w-0 flex-1 text-xs" /></span></label>
      </div>
      {imagePreview && <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"><Image src={imagePreview} alt="Pratinjau gambar soal" width={320} height={224} unoptimized className="max-h-28 max-w-40 rounded-md object-contain" /><Button variant="ghost" type="button" onClick={() => { setImageFile(null); setImagePath(""); setImagePreview(""); }}>Lepas gambar</Button></div>}
      {formError && <Alert tone="error">{formError}</Alert>}
      {subjects.length === 0 && !optionLoadError && <EmptyState title="Mata pelajaran belum tersedia" detail="Mata pelajaran aktif diperlukan sebelum soal dapat disimpan." />}
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white py-3 dark:border-slate-700 dark:bg-[#111827]"><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={busy || subjects.length === 0 || !prompt.trim()}>{busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? "Menyimpan..." : "Simpan sebagai draft"}</Button></div>
    </form>
  </Modal>;
}