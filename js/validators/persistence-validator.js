import { computeIntegrityChecksum } from "../utils/canonical-json.js";

export const SAVE_FORMAT = "PROJECT_DRAGON_SAVE";
export const SAVE_FORMAT_VERSION = 1;

export function envelopeChecksumInput(envelope) {
  const { checksum: _checksum, ...input } = envelope;
  return input;
}

export function validateSaveEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) return { ok: false, code: "INVALID_SAVE_ENVELOPE" };
  if (envelope.format !== SAVE_FORMAT) return { ok: false, code: "INVALID_SAVE_FORMAT" };
  if (envelope.formatVersion !== SAVE_FORMAT_VERSION) return { ok: false, code: "UNSUPPORTED_SAVE_FORMAT_VERSION" };
  if (!envelope.schemaVersion || !envelope.saveId || !envelope.state ||
      Number.isNaN(Date.parse(envelope.createdAt)) || Number.isNaN(Date.parse(envelope.updatedAt))) {
    return { ok: false, code: "INVALID_SAVE_ENVELOPE" };
  }
  if (computeIntegrityChecksum(envelopeChecksumInput(envelope)) !== envelope.checksum) return { ok: false, code: "SAVE_CHECKSUM_MISMATCH" };
  return { ok: true, code: null };
}
