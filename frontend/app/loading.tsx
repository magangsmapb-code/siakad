import { Skeleton } from "@/components/ui/feedback";

export default function Loading() {
  return <main className="mx-auto max-w-6xl p-6 sm:p-9" aria-label="Memuat halaman"><Skeleton className="h-4 w-36" /><Skeleton className="mt-4 h-9 w-72 max-w-full" /><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_item, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}</section></main>;
}