import { cloneSerializable } from "../core/state-snapshot.js";

export const HISTORICAL_FIXTURE_VERSION = "0.9.0";
export const CURRENT_MIGRATION_TARGET = "1.0.0";

export function migrateV1ToV2(input) {
  if (input?.schemaVersion !== HISTORICAL_FIXTURE_VERSION) {
    throw new TypeError(`Se esperaba schemaVersion ${HISTORICAL_FIXTURE_VERSION}.`);
  }
  const state = cloneSerializable(input);
  state.schemaVersion = CURRENT_MIGRATION_TARGET;
  state.system ??= {};
  state.system.conditionSignals ??= [];
  state.system.restorationHistory ??= [];
  return state;
}
