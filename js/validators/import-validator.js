export const MAX_IMPORT_SIZE = 2_000_000;

export function validateImportText(text) {
  if (typeof text !== "string" || !text.trim()) return { ok: false, code: "IMPORT_TEXT_REQUIRED", message: "La importación exige texto JSON." };
  if (text.length > MAX_IMPORT_SIZE) return { ok: false, code: "IMPORT_TOO_LARGE", message: "La importación supera el límite permitido." };
  return { ok: true };
}
