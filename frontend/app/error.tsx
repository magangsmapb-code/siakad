"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/feedback";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="mx-auto max-w-3xl px-4 py-16"><ErrorState detail="Halaman mengalami kendala. Muat ulang bagian ini atau kembali beberapa saat lagi." onRetry={reset} /></main>;
}