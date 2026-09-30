import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function VerifyEmailPage() {
  return <main className="auth-grid relative grid min-h-dvh place-items-center px-4"><div className="fixed right-4 top-4 z-20"><ThemeToggle /></div><section className="enter w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><MailCheck size={24} /></span><h1 className="mt-5 text-2xl font-semibold text-slate-900">Periksa email Anda</h1><p className="mt-2 text-sm leading-6 text-slate-500">Ikuti tautan verifikasi yang kami kirimkan untuk mengaktifkan akun dan melanjutkan ke portal.</p><Link href="/login" className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800">Kembali ke login</Link></section></main>;
}