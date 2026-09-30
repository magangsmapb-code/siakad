import { apiRequest } from "@/services/api-client";

export type MaterialRecord = {
  id: string;
  class_id: string;
  subject_id: string | null;
  teacher_id: string;
  title: string;
  description: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
};

export type MaterialPage = { data: MaterialRecord[] | null; error: { message: string } | null; meta?: Record<string, unknown> | null };

export const materialService = {
  list(page: number, search: string, classId: string, subjectId: string, status: string) {
    const params = new URLSearchParams({ page: String(page), page_size: "12", sort_by: "created_at", sort_direction: "desc" });
    if (search) params.set("search", search);
    if (classId) params.set("class_id", classId);
    if (subjectId) params.set("subject_id", subjectId);
    if (status) params.set("status", status);
    return apiRequest<MaterialRecord[]>(`/api/materials?${params.toString()}`);
  },
  async upload(classId: string, title: string, description: string, subjectId: string, file: File) {
    const form = new FormData();
    form.set("class_id", classId);
    form.set("title", title);
    form.set("description", description);
    if (subjectId) form.set("subject_id", subjectId);
    form.set("file", file);
    return apiRequest<MaterialRecord>("/api/materials", { method: "POST", body: form });
  },
  publish(id: string) {
    return apiRequest<MaterialRecord>(`/api/materials/${id}/publish`, { method: "POST" });
  },
  unpublish(id: string) {
    return apiRequest<MaterialRecord>(`/api/materials/${id}/unpublish`, { method: "POST" });
  },
  archive(id: string) {
    return apiRequest<MaterialRecord>(`/api/materials/${id}`, { method: "DELETE" });
  },
  download(id: string) {
    return apiRequest<{ signed_url: string; expires_in: number }>(`/api/materials/${id}/download`);
  },
  listClasses() {
    return apiRequest<{ id: string; name: string }[]>("/api/classes?page_size=100&sort_by=name");
  },
  listSubjects() {
    return apiRequest<{ id: string; code: string; name: string }[]>("/api/subjects?page_size=100&sort_by=name");
  },
};