import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type DashboardStat = { label: string; value: number | null; detail: string };
export type DashboardSummary = { stats: DashboardStat[]; hasErrors: boolean };

async function countRows(
  supabase: SupabaseClient,
  table: string,
  filter?: { column: string; value: string },
): Promise<{ count: number | null; error: boolean }> {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) query = query.eq(filter.column, filter.value);
  const result = await query;
  return { count: result.error ? null : result.count, error: Boolean(result.error) };
}

export const dashboardService = {
  async getSummary(profileId: string, role: UserRole): Promise<DashboardSummary> {
    const supabase = await createClient();
    const definitions: { label: string; table: string; filter?: { column: string; value: string }; detail: string }[] =
      role === "DEVELOPER"
        ? [
            { label: "Akun developer", table: "profiles", filter: { column: "role", value: "DEVELOPER" }, detail: "Akun dengan akses administrasi" },
            { label: "Guru", table: "teachers", detail: "Profil guru terdaftar" },
            { label: "Murid", table: "students", detail: "Profil murid terdaftar" },
            { label: "Kelas", table: "classes", detail: "Ruang kelas akademik" },
          ]
        : role === "GURU"
          ? [
              { label: "Kelas diajar", table: "class_teachers", detail: "Kelas yang ditugaskan" },
              { label: "Murid", table: "students", detail: "Murid pada kelas yang diajar" },
              { label: "Asesmen", table: "exams", detail: "Asesmen pada kelas yang dikelola" },
              { label: "Materi", table: "materials", detail: "Materi pada kelas yang dikelola" },
            ]
          : [
              { label: "Nilai", table: "grades", detail: "Nilai yang sudah dipublikasikan" },
              { label: "Kehadiran", table: "attendance", detail: "Catatan kehadiran Anda" },
              { label: "Ujian", table: "exams", detail: "Ujian untuk kelas Anda" },
              { label: "Percobaan ujian", table: "exam_attempts", detail: "Percobaan ujian Anda" },
            ];

    const results = await Promise.all(definitions.map(async (definition) => {
      const table = definition.table;
      let filter = definition.filter;
      if (role === "GURU" && definition.label === "Kelas diajar") {
        const teacher = await supabase.from("teachers").select("id").eq("profile_id", profileId).maybeSingle();
        if (teacher.error || !teacher.data) return { ...definition, value: null, error: Boolean(teacher.error) };
        filter = { column: "teacher_id", value: teacher.data.id };
      }
      const result = await countRows(supabase, table, filter);
      return { ...definition, value: result.count, error: result.error };
    }));

    return {
      stats: results.map(({ label, value, detail }) => ({ label, value, detail })),
      hasErrors: results.some(({ error }) => error),
    };
  },
};