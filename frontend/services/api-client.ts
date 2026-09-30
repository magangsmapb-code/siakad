import { createClient } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types/api";
import { ApiRequestError } from "@/types/api";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new ApiRequestError("API belum dikonfigurasi.", 503, "api_unconfigured");

  const { data: { session }, error: sessionError } = await createClient().auth.getSession();
  if (sessionError || !session) throw new ApiRequestError("Sesi login tidak tersedia.", 401, "unauthenticated");

  let response: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
    headers.set("Authorization", `Bearer ${session.access_token}`);
    if (typeof FormData === "undefined" || !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    response = await fetch(new URL(path.replace(/^\//, ""), `${apiUrl.replace(/\/$/, "")}/`), {
      ...init,
      cache: "no-store",
      headers,
    });
  } catch {
    throw new ApiRequestError("Layanan API tidak dapat dijangkau.", 503, "api_unavailable");
  }

  if (response.status === 204) return { data: null, error: null };
  const result = await response.json() as ApiResponse<T>;
  if (!response.ok || result.error) {
    throw new ApiRequestError(result.error?.message ?? "Permintaan API gagal.", response.status, result.error?.code);
  }
  if (result.data === null) throw new ApiRequestError("API tidak mengembalikan data.", response.status, "empty_response");
  return result;
}

export async function apiDownload(path: string): Promise<Blob> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new ApiRequestError("API belum dikonfigurasi.", 503, "api_unconfigured");
  const { data: { session }, error: sessionError } = await createClient().auth.getSession();
  if (sessionError || !session) throw new ApiRequestError("Sesi login tidak tersedia.", 401, "unauthenticated");

  let response: Response;
  try {
    response = await fetch(new URL(path.replace(/^\//, ""), `${apiUrl.replace(/\/$/, "")}/`), {
      cache: "no-store",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch {
    throw new ApiRequestError("Layanan API tidak dapat dijangkau.", 503, "api_unavailable");
  }

  if (!response.ok) {
    const result = await response.json() as ApiResponse<unknown>;
    throw new ApiRequestError(result.error?.message ?? "Unduhan gagal.", response.status, result.error?.code);
  }
  return response.blob();
}