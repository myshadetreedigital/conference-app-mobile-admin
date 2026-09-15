import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Uploads a file to the public `event-media` Storage bucket and
 * returns its public URL, or null if no file was actually selected
 * (a file input with nothing chosen still submits a zero-size File).
 */
export async function uploadEventMedia(
  supabase: SupabaseClient,
  file: File | null,
  folder: "speakers" | "sponsors",
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const path = `${folder}/${randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("event-media").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("event-media").getPublicUrl(path);
  return data.publicUrl;
}
