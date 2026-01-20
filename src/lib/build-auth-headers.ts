"use client";

import { supabaseBrowser } from "./supabase-browser";
import { getDemoUserId } from "./demo-user";

export async function buildAuthHeaders(): Promise<Record<string, string>> {
  const supabase = supabaseBrowser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  const userId = session?.user?.id || getDemoUserId();
  headers["x-user-id"] = userId;
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}
