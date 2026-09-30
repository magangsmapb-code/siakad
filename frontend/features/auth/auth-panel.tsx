"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Facebook, GraduationCap, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { authService } from "@/services/auth.service";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type AuthMode = "login" | "register" | "forgot" | "reset";

const titles: Record<AuthMode, { eyebrow: string; title: string; detail: string }> = {
  login: { eyebrow: "PORTAL AKADEMIK", title: "Selamat datang kembali", detail: "Masuk untuk melanjutkan aktivitas akademik Anda." },
  register: { eyebrow: "AKUN MURID", title: "Mulai perjalanan belajar", detail: "Buat akun murid untuk mengakses layanan sekolah." },
  forgot: { eyebrow: "PEMULIHAN AKUN", title: "Atur ulang akses", detail: "Kami akan mengirim tautan pemulihan ke email Anda." },
  reset: { eyebrow: "KEAMANAN AKUN", title: "Buat kata sandi baru", detail: "Pilih kata sandi yang kuat dan belum pernah digunakan." },
};

export function AuthPanel({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      if (mode === "login") {
        const { error: authError } = await authService.signIn({ email, password });
        if (authError) throw authError;
        router.replace("/auth/callback");
        return;
      }
      if (mode === "register") {
        const { data, error: authError } = await authService.signUp({
          email,
          password,
          fullName: String(form.get("fullName") ?? "").trim(),
        });
        if (authError) throw authError;
        if (data.session) router.replace("/auth/callback");
        else setMessage("Periksa email Anda untuk memverifikasi akun sebelum masuk.");
      }
      if (mode === "forgot") {
        const { error: authError } = await authService.requestPasswordReset(email);
        if (authError) throw authError;
        setMessage("Jika alamat terdaftar, tautan pemulihan akan segera dikirim.");
      }
      if (mode === "reset") {
        const { error: authError } = await authService.updatePassword(password);
        if (authError) throw authError;
        setMessage("Kata sandi berhasil diperbarui. Silakan masuk kembali.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Permintaan tidak dapat diproses.");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "facebook") {
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await authService.signInWithProvider(provider);
      if (authError) throw authError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login sosial tidak dapat dimulai.");
      setBusy(false);
    }
  }

  const copy = titles[mode];
  const showSocial = mode === "login" || mode === "register";

  return (
    <main className="auth-grid relative min-h-dvh px-4 py-6 sm:px-8 lg:grid lg:grid-cols-[1fr_480px] lg:items-center lg:gap-16 lg:px-[8vw]">
      <div className="fixed right-4 top-4 z-20"><ThemeToggle /></div>
      <section className="mx-auto flex w-full max-w-2xl flex-col justify-center py-6 lg:min-h-[82vh]">
        <Link href="/login" className="mb-16 flex w-fit items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-700 text-white"><GraduationCap size={23} /></span>
          <span><span className="block text-sm font-semibold tracking-wide text-slate-900">SMA PEMBERDAYAAN BANGSA</span><span className="mt-0.5 block text-xs text-slate-500">Sistem Informasi Akademik</span></span>
        </Link>
        <div className="enter max-w-xl">
          <p className="mb-4 text-xs font-semibold tracking-[.15em] text-emerald-700">BELAJAR · BERTUMBUH · BERDAYA</p>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">Ruang belajar yang bergerak bersama Anda.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-600">Satu tempat untuk mengikuti kelas, mengelola pembelajaran, dan bertumbuh bersama komunitas sekolah.</p>
        </div>
        <div className="mt-12 hidden grid-cols-2 gap-3 sm:grid max-w-lg">
          <div className="flex items-center gap-3 border-t border-slate-200 py-4 text-sm text-slate-600"><BookOpen size={17} className="text-emerald-700" /> Pembelajaran terhubung</div>
          <div className="flex items-center gap-3 border-t border-slate-200 py-4 text-sm text-slate-600"><ShieldCheck size={17} className="text-emerald-700" /> Akses sesuai peran</div>
        </div>
      </section>

      <section className="enter mx-auto w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,.35)] sm:p-9">
        <p className="text-xs font-semibold tracking-[.13em] text-emerald-700">{copy.eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{copy.detail}</p>

        {showSocial && <div className="mt-7 grid grid-cols-2 gap-3">
          <button type="button" disabled={busy} onClick={() => void social("google")} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><span className="font-bold text-base text-blue-600">G</span> Google</button>
          <button type="button" disabled={busy} onClick={() => void social("facebook")} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><Facebook size={17} className="fill-blue-700 text-blue-700" /> Facebook</button>
        </div>}

        {showSocial && <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />ATAU DENGAN EMAIL<span className="h-px flex-1 bg-slate-200" /></div>}
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          {mode === "register" && <label className="block text-sm font-medium text-slate-700">Nama lengkap<div className="relative mt-1.5"><GraduationCap size={17} className="absolute left-3 top-3 text-slate-400" /><input name="fullName" autoComplete="name" required maxLength={120} className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Nama sesuai data sekolah" /></div></label>}
          {mode !== "reset" && <label className="block text-sm font-medium text-slate-700">Email<div className="relative mt-1.5"><Mail size={17} className="absolute left-3 top-3 text-slate-400" /><input name="email" type="email" autoComplete="email" required maxLength={254} className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="nama@email.com" /></div></label>}
          {mode !== "forgot" && <label className="block text-sm font-medium text-slate-700">{mode === "reset" ? "Kata sandi baru" : "Kata sandi"}<div className="relative mt-1.5"><LockKeyhole size={17} className="absolute left-3 top-3 text-slate-400" /><input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Minimal 8 karakter" /></div></label>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{message}</p>}
          <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">{busy ? "Memproses..." : mode === "login" ? "Masuk" : mode === "register" ? "Buat akun murid" : mode === "forgot" ? "Kirim tautan pemulihan" : "Simpan kata sandi"}{!busy && <ArrowRight size={16} />}</button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          {mode === "login" && <><Link className="text-emerald-700 hover:underline" href="/forgot-password">Lupa kata sandi?</Link><span className="text-slate-500">Belum punya akun? <Link className="font-medium text-emerald-700 hover:underline" href="/register">Daftar</Link></span></>}
          {mode === "register" && <span className="text-slate-500">Sudah punya akun? <Link className="font-medium text-emerald-700 hover:underline" href="/login">Masuk</Link></span>}
          {(mode === "forgot" || mode === "reset") && <Link className="text-emerald-700 hover:underline" href="/login">Kembali ke login</Link>}
        </div>
      </section>
      <footer className="col-span-full mx-auto mt-8 w-full max-w-6xl text-xs text-slate-400 lg:mt-0">© {new Date().getFullYear()} SMA Pemberdayaan Bangsa</footer>
    </main>
  );
}