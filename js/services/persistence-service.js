import { cloneSerializable } from "../core/state-snapshot.js";
import { assertValidWorldState } from "../validators/world-state-validator.js";
import { computeIntegrityChecksum } from "../utils/canonical-json.js";
import { validateImportText } from "../validators/import-validator.js";
import {
  SAVE_FORMAT,
  SAVE_FORMAT_VERSION,
  envelopeChecksumInput,
  validateSaveEnvelope,
} from "../validators/persistence-validator.js";
import { MigrationService } from "./migration-service.js";

export const STORAGE_NAMESPACE = "project-dragon";
export const STORAGE_KEYS = Object.freeze({
  primary: `${STORAGE_NAMESPACE}:save:primary`,
  backup: `${STORAGE_NAMESPACE}:save:backup`,
  metadata: `${STORAGE_NAMESPACE}:save:metadata`,
});

const ok = (value) => ({ ok: true, value, error: null });
const fail = (code, message, details = {}) => ({ ok: false, value: null, error: { code, message, details } });

export class PersistenceService {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.appVersion = options.appVersion ?? "1.0.0";
    this.idFactory = options.idFactory ?? ((timestamp) => `save-${timestamp.replace(/[^0-9]/g, "")}`);
    this.migrationService = options.migrationService ?? new MigrationService();
  }

  createSave(state, metadata = {}) {
    try { assertValidWorldState(state); } catch (error) { return fail("INVALID_WORLD_STATE", error.message, { errors: error.errors ?? [] }); }
    const now = metadata.updatedAt ?? this.clock();
    const envelope = {
      format: SAVE_FORMAT,
      formatVersion: SAVE_FORMAT_VERSION,
      schemaVersion: state.schemaVersion,
      saveId: metadata.saveId ?? this.idFactory(now),
      createdAt: metadata.createdAt ?? now,
      updatedAt: now,
      appVersion: this.appVersion,
      checksum: "",
      state: cloneSerializable(state),
    };
    try {
      envelope.checksum = computeIntegrityChecksum(envelopeChecksumInput(envelope));
      return ok(envelope);
    } catch (error) { return fail("SAVE_SERIALIZATION_FAILED", error.message); }
  }

  serializeSave(envelope) {
    try { return ok(JSON.stringify(envelope, null, 2)); } catch (error) { return fail("SAVE_SERIALIZATION_FAILED", error.message); }
  }

  deserializeSave(text) {
    let envelope;
    try { envelope = JSON.parse(text); } catch (error) { return fail("SAVE_DESERIALIZATION_FAILED", error.message); }
    return this.prepareEnvelope(envelope);
  }

  prepareEnvelope(envelope) {
    let validation;
    try { validation = validateSaveEnvelope(envelope); } catch (error) { return fail("INVALID_SAVE_ENVELOPE", error.message); }
    if (!validation.ok) return fail(validation.code, "El Save Envelope no es válido.");
    const migrated = this.migrationService.migrate(envelope.state);
    if (!migrated.ok) return migrated;
    try { assertValidWorldState(migrated.value); } catch (error) { return fail("INVALID_WORLD_STATE", error.message, { errors: error.errors ?? [] }); }
    const prepared = cloneSerializable(envelope);
    prepared.state = migrated.value;
    prepared.schemaVersion = migrated.value.schemaVersion;
    return ok(prepared);
  }

  save(state) {
    let previous = null;
    try { previous = this.adapter.getItem(STORAGE_KEYS.primary); } catch (error) { return fail(error.code ?? "STORAGE_READ_FAILED", error.message); }
    let metadata = {};
    if (previous) {
      const parsed = this.deserializeSave(previous);
      if (!parsed.ok) return fail(parsed.error.code, "La primaria existente no es válida; no será reemplazada.");
      metadata = { saveId: parsed.value.saveId, createdAt: parsed.value.createdAt };
      try { this.adapter.setItem(STORAGE_KEYS.backup, previous); } catch (error) { return fail(error.code ?? "STORAGE_WRITE_FAILED", error.message); }
    }
    const created = this.createSave(state, metadata);
    if (!created.ok) return created;
    const serialized = this.serializeSave(created.value);
    if (!serialized.ok) return serialized;
    try {
      this.adapter.setItem(STORAGE_KEYS.primary, serialized.value);
      const verified = this.deserializeSave(this.adapter.getItem(STORAGE_KEYS.primary));
      if (!verified.ok) throw Object.assign(new Error("La escritura no pudo verificarse."), { code: verified.error.code });
      this.adapter.setItem(STORAGE_KEYS.metadata, JSON.stringify(this.metadataFromEnvelope(verified.value)));
      return ok(cloneSerializable(verified.value));
    } catch (error) {
      if (previous !== null) {
        try { this.adapter.setItem(STORAGE_KEYS.primary, previous); } catch { /* backup conserva la última partida válida */ }
      }
      return fail(error.code ?? "STORAGE_WRITE_FAILED", error.message);
    }
  }

  load() {
    let text;
    try { text = this.adapter.getItem(STORAGE_KEYS.primary); } catch (error) { return fail(error.code ?? "STORAGE_READ_FAILED", error.message); }
    if (text === null) return fail("SAVE_NOT_FOUND", "No existe una partida primaria.");
    const loaded = this.deserializeSave(text);
    return loaded.ok ? ok(cloneSerializable(loaded.value.state)) : loaded;
  }

  hasSave() { try { return this.adapter.hasItem(STORAGE_KEYS.primary); } catch { return false; } }
  hasBackup() { try { return this.adapter.hasItem(STORAGE_KEYS.backup); } catch { return false; } }
  deleteSave() {
    try { this.adapter.removeItem(STORAGE_KEYS.primary); this.adapter.removeItem(STORAGE_KEYS.metadata); return ok(true); }
    catch (error) { return fail(error.code ?? "STORAGE_REMOVE_FAILED", error.message); }
  }
  deleteBackup() {
    try { this.adapter.removeItem(STORAGE_KEYS.backup); return ok(true); }
    catch (error) { return fail(error.code ?? "STORAGE_REMOVE_FAILED", error.message); }
  }
  createBackup() {
    try {
      const primary = this.adapter.getItem(STORAGE_KEYS.primary);
      if (primary === null) return fail("SAVE_NOT_FOUND", "No existe primaria para respaldar.");
      const validated = this.deserializeSave(primary);
      if (!validated.ok) return validated;
      this.adapter.setItem(STORAGE_KEYS.backup, primary);
      return ok(cloneSerializable(validated.value));
    } catch (error) { return fail(error.code ?? "STORAGE_WRITE_FAILED", error.message); }
  }
  loadBackup() {
    try {
      const text = this.adapter.getItem(STORAGE_KEYS.backup);
      if (text === null) return fail("BACKUP_NOT_FOUND", "No existe backup.");
      const loaded = this.deserializeSave(text);
      return loaded.ok ? ok(cloneSerializable(loaded.value.state)) : loaded;
    } catch (error) { return fail(error.code ?? "STORAGE_READ_FAILED", error.message); }
  }
  restoreBackup() {
    let text;
    try { text = this.adapter.getItem(STORAGE_KEYS.backup); } catch (error) { return fail(error.code ?? "STORAGE_READ_FAILED", error.message); }
    if (text === null) return fail("BACKUP_NOT_FOUND", "No existe backup.");
    const validated = this.deserializeSave(text);
    if (!validated.ok) return validated;
    try {
      this.adapter.setItem(STORAGE_KEYS.primary, text);
      return ok(cloneSerializable(validated.value.state));
    } catch (error) { return fail(error.code ?? "STORAGE_WRITE_FAILED", error.message); }
  }
  exportSave() {
    try {
      const text = this.adapter.getItem(STORAGE_KEYS.primary);
      if (text === null) return fail("SAVE_NOT_FOUND", "No existe partida para exportar.");
      const validated = this.deserializeSave(text);
      return validated.ok ? ok(JSON.stringify(validated.value, null, 2)) : validated;
    } catch (error) { return fail(error.code ?? "STORAGE_READ_FAILED", error.message); }
  }
  importSave(text) {
    const input = validateImportText(text);
    if (!input.ok) return fail(input.code, input.message);
    const parsed = this.deserializeSave(text);
    if (!parsed.ok) return fail("IMPORT_FAILED", parsed.error.message, { causeCode: parsed.error.code });
    const previous = this.hasSave() ? this.adapter.getItem(STORAGE_KEYS.primary) : null;
    try {
      if (previous) this.adapter.setItem(STORAGE_KEYS.backup, previous);
      const refreshed = this.createSave(parsed.value.state, {
        saveId: parsed.value.saveId,
        createdAt: parsed.value.createdAt,
      });
      if (!refreshed.ok) return refreshed;
      const serialized = this.serializeSave(refreshed.value);
      this.adapter.setItem(STORAGE_KEYS.primary, serialized.value);
      return ok(cloneSerializable(refreshed.value.state));
    } catch (error) {
      if (previous) try { this.adapter.setItem(STORAGE_KEYS.primary, previous); } catch { /* backup disponible */ }
      return fail("IMPORT_FAILED", error.message);
    }
  }
  getMetadata() {
    try {
      const text = this.adapter.getItem(STORAGE_KEYS.primary);
      if (!text) return ok({ hasSave: false, hasBackup: this.hasBackup() });
      const parsed = this.deserializeSave(text);
      if (!parsed.ok) return parsed;
      return ok({ hasSave: true, hasBackup: this.hasBackup(), ...this.metadataFromEnvelope(parsed.value) });
    } catch (error) { return fail(error.code ?? "STORAGE_READ_FAILED", error.message); }
  }
  metadataFromEnvelope(envelope) {
    return Object.fromEntries(["saveId", "createdAt", "updatedAt", "schemaVersion", "formatVersion"].map((key) => [key, envelope[key]]));
  }
}
