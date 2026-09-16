import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Mirrors the event-media bucket's allowed_mime_types/file_size_limit
// (supabase/migrations/0010_scope_media_storage_to_event_admins.sql)
// so a rejected upload gets a clear error instead of a raw storage
// API failure.
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Uploads a file to the public `event-media` Storage bucket and
 * returns its public URL, or null if no file was actually selected
 * (a file input with nothing chosen still submits a zero-size File).
 *
 * The path is namespaced under eventId so the bucket's storage
 * policies can scope insert/delete to admins of that event's org
 * (is_event_admin() reads the leading path segment) — see the
 * migration above for the policies this depends on.
 */
export async function uploadEventMedia(
  supabase: SupabaseClient,
  eventId: string,
  file: File | null,
  folder: "speakers" | "sponsors",
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File is too large (max 5MB).");
  }

  const path = `${eventId}/${folder}/${randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("event-media").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("event-media").getPublicUrl(path);
  return data.publicUrl;
}
