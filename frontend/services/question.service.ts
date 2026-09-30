import { apiDownload, apiRequest } from "@/services/api-client";
import type { ApiResponse } from "@/types/api";

export type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "essay";
export type Difficulty = "easy" | "medium" | "hard";

export type QuestionRecord = {
  id: string;
  subject_id: string;
  class_id: string | null;
  chapter: string | null;
  topic: string | null;
  difficulty: Difficulty;
  question_type: QuestionType;
  prompt: string;
  options: string[];
  correct_answer: string | boolean | null;
  explanation: string | null;
  image_path: string | null;
  default_points: number;
  status: "draft" | "published" | "archived";
  created_at: string;
};

export type QuestionInput = {
  subject_id: string;
  class_id: string | null;
  chapter: string | null;
  topic: string | null;
  difficulty: Difficulty;
  question_type: QuestionType;
  question: string;
  options: string[];
  correct_answer: string | boolean | null;
  explanation: string | null;
  image_path: string | null;
  points: number;
};

export type QuestionFilters = {
  page: number;
  pageSize: number;
  search: string;
  subjectId: string;
  classId: string;
  difficulty: string;
  questionType: string;
  status: string;
};

export const questionService = {
  list(filters: QuestionFilters) {
    const params = new URLSearchParams({ page: String(filters.page), page_size: String(filters.pageSize), sort_by: "created_at", sort_direction: "desc" });
    if (filters.search) params.set("search", filters.search);
    if (filters.subjectId) params.set("subject_id", filters.subjectId);
    if (filters.classId) params.set("class_id", filters.classId);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    if (filters.questionType) params.set("question_type", filters.questionType);
    if (filters.status) params.set("status", filters.status);
    return apiRequest<QuestionRecord[]>(`/api/questions?${params.toString()}`);
  },
  create(input: QuestionInput) {
    return apiRequest<QuestionRecord>("/api/questions", { method: "POST", body: JSON.stringify(input) });
  },
  update(id: string, input: QuestionInput) {
    return apiRequest<QuestionRecord>(`/api/questions/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },
  archive(id: string) {
    return apiRequest<QuestionRecord>(`/api/questions/${id}`, { method: "DELETE" });
  },
  duplicate(id: string) {
    return apiRequest<QuestionRecord>(`/api/questions/${id}/duplicate`, { method: "POST" });
  },
  archiveMany(ids: string[]) {
    return apiRequest<{ archived: number }>("/api/questions/bulk/archive", { method: "POST", body: JSON.stringify({ ids }) });
  },
  importMany(questions: QuestionInput[]) {
    return apiRequest<QuestionRecord[]>("/api/questions/import", { method: "POST", body: JSON.stringify({ questions }) });
  },
  exportCsv() {
    return apiDownload("/api/questions/export");
  },
  async uploadImage(file: File) {
    const form = new FormData();
    form.set("file", file);
    return apiRequest<{ image_path: string; file_name: string; file_mime_type: string; file_size_bytes: number }>("/api/question-images", { method: "POST", body: form });
  },
  previewImage(imagePath: string) {
    return apiRequest<{ signed_url: string }>("/api/question-images/signed-url", { method: "POST", body: JSON.stringify({ image_path: imagePath }) });
  },
  listSubjects() {
    return apiRequest<{ id: string; code: string; name: string }[]>("/api/subjects?page_size=100&sort_by=name");
  },
  listClasses() {
    return apiRequest<{ id: string; name: string }[]>("/api/classes?page_size=100&sort_by=name");
  },
};

export type QuestionListResponse = ApiResponse<QuestionRecord[]>;