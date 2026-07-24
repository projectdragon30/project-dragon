import { cloneSerializable } from "../core/state-snapshot.js";
import { WORLD_STATE_SCHEMA_VERSION } from "../core/state-factory.js";
import { MIGRATION_REGISTRY } from "../migrations/migration-registry.js";

function versionParts(version) { return version.split(".").map(Number); }
function compareVersions(left, right) {
  const a = versionParts(left); const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
}

export class MigrationService {
  constructor(registry = MIGRATION_REGISTRY, currentVersion = WORLD_STATE_SCHEMA_VERSION) {
    this.registry = registry;
    this.currentVersion = currentVersion;
  }
  migrate(input) {
    if (compareVersions(input.schemaVersion, this.currentVersion) > 0) {
      return { ok: false, value: null, error: { code: "UNSUPPORTED_FUTURE_SCHEMA_VERSION", message: "La partida usa un schema futuro.", details: { schemaVersion: input.schemaVersion } } };
    }
    let state = cloneSerializable(input);
    try {
      while (state.schemaVersion !== this.currentVersion) {
        const step = this.registry[state.schemaVersion];
        if (!step) return { ok: false, value: null, error: { code: "MIGRATION_PATH_NOT_FOUND", message: "No existe una ruta completa de migración.", details: { schemaVersion: state.schemaVersion } } };
        state = step.migrate(state);
        if (state.schemaVersion !== step.toVersion) throw new Error("La migración produjo una versión inesperada.");
      }
      return { ok: true, value: state, error: null };
    } catch (error) {
      return { ok: false, value: null, error: { code: "MIGRATION_FAILED", message: error.message, details: {} } };
    }
  }
}
