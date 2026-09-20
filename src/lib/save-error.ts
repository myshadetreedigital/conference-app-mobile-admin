/**
 * A readable message for a database error raised while saving a More Info row.
 * The one case worth spelling out is an icon the database doesn't accept yet, which
 * happens until migration 0020 (which lets the database take any well-formed icon
 * name) has been run.
 */
export function describeSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error);
  if (/event_info_sections_icon_check|violates check constraint.*icon/i.test(message)) {
    return "The database doesn't accept that icon yet. Run migration 0020_more_info_icon_names.sql in the Supabase SQL editor, then save again.";
  }
  return `Couldn't save this row: ${message}`;
}
