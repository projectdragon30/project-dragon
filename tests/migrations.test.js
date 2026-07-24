import { createInitialWorldState } from "../js/core/state-factory.js";
import { migrateV1ToV2 } from "../js/migrations/migrate-v1-to-v2.js";
import { MigrationService } from "../js/services/migration-service.js";
import { assert, equal, test } from "./test-utils.js";

function historical() {
  const state = createInitialWorldState();
  state.schemaVersion = "0.9.0";
  delete state.system.conditionSignals;
  delete state.system.restorationHistory;
  return state;
}

test("migración histórica es determinista, no muta y preserva historiales", () => {
  const input = historical();
  const before = JSON.stringify(input);
  const first = migrateV1ToV2(input);
  const second = migrateV1ToV2(input);
  equal(JSON.stringify(input), before);
  equal(first.schemaVersion, "1.0.0");
  equal(JSON.stringify(first), JSON.stringify(second));
  equal(JSON.stringify(first.eventLog), JSON.stringify(input.eventLog));
  equal(JSON.stringify(first.xpTransactions), JSON.stringify(input.xpTransactions));
  equal(JSON.stringify(first.rewardTransactions), JSON.stringify(input.rewardTransactions));
  equal(JSON.stringify(first.contributions), JSON.stringify(input.contributions));
});

test("MigrationService aplica ruta secuencial y produce estado actual", () => {
  const result = new MigrationService().migrate(historical());
  assert(result.ok);
  equal(result.value.schemaVersion, "1.0.0");
});

test("ruta faltante y versión futura se rechazan", () => {
  const service = new MigrationService();
  equal(service.migrate({ schemaVersion: "0.1.0" }).error.code, "MIGRATION_PATH_NOT_FOUND");
  equal(service.migrate({ schemaVersion: "9.0.0" }).error.code, "UNSUPPORTED_FUTURE_SCHEMA_VERSION");
});
