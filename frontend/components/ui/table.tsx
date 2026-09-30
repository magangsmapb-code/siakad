import { EmptyState } from "@/components/ui/feedback";

export type TableColumn<T> = { key: keyof T; label: string; render?: (row: T) => React.ReactNode };

export function Table<T extends { id: string }>({ columns, rows, emptyTitle = "Belum ada data", emptyDetail = "Data akan tampil saat tersedia." }: { columns: TableColumn<T>[]; rows: T[]; emptyTitle?: string; emptyDetail?: string }) {
  if (!rows.length) return <EmptyState title={emptyTitle} detail={emptyDetail} />;
  return <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="w-full min-w-[600px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr>{columns.map((column) => <th key={String(column.key)} scope="col" className="px-4 py-3">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-[#111827]">{rows.map((row) => <tr key={row.id} className="text-slate-700 dark:text-slate-200">{columns.map((column) => <td key={String(column.key)} className="px-4 py-3">{column.render ? column.render(row) : String(row[column.key] ?? "—")}</td>)}</tr>)}</tbody></table></div>;
}