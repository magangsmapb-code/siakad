import Link from "next/link";
import { EmptyState } from "@/components/ui/feedback";

export default function NotFound() {
  return <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 dark:bg-[#0b1220]"><div className="w-full max-w-lg"><p className="mb-4 text-center text-xs font-semibold tracking-[.14em] text-emerald-700 dark:text-emerald-400">404</p><EmptyState title="Halaman tidak ditemukan" detail="Alamat yang dibuka tidak tersedia atau telah berubah." /><div className="mt-5 text-center"><Link href="/login" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Kembali ke login</Link></div></div></main>;
}