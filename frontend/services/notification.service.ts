import { createClient } from "@/lib/supabase/client";

export type NotificationItem = { id: string; title: string; body: string; created_at: string; read_at: string | null };

export const notificationService = {
  async listRecent() {
    return createClient().from("notifications").select("id,title,body,created_at,read_at").order("created_at", { ascending: false }).limit(5);
  },
  async markRead(id: string) {
    return createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  },
};