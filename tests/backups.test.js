import { MemoryStorageAdapter } from "../js/adapters/memory-storage-adapter.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { PersistenceService, STORAGE_KEYS } from "../js/services/persistence-service.js";
import { assert, equal, test } from "./test-utils.js";

function setup() {
  const storage = new MemoryStorageAdapter();
  return { storage, persistence: new PersistenceService(storage, { clock: () => "2026-07-24T00:00:00.000Z" }) };
}

test("backup es independiente, restaurable y no se elimina al restaurar", () => {
  const { persistence } = setup();
  const state = createInitialWorldState();
  persistence.save(state);
  assert(persistence.createBackup().ok);
  const loaded = persistence.loadBackup();
  loaded.value.player.id = "changed";
  assert(persistence.loadBackup().value.player.id !== "changed");
  assert(persistence.restoreBackup().ok);
  assert(persistence.hasBackup());
});

test("backup corrupto no reemplaza primaria", () => {
  const { storage, persistence } = setup();
  persistence.save(createInitialWorldState());
  const before = persistence.exportSave().value;
  storage.setItem(STORAGE_KEYS.backup, "{}");
  assert(!persistence.restoreBackup().ok);
  equal(persistence.exportSave().value, before);
});

test("primaria corrupta puede recuperarse desde backup", () => {
  const { storage, persistence } = setup();
  persistence.save(createInitialWorldState());
  persistence.createBackup();
  storage.setItem(STORAGE_KEYS.primary, "{corrupt");
  assert(persistence.restoreBackup().ok);
  assert(persistence.load().ok);
});

test("borrar backup conserva primaria", () => {
  const { persistence } = setup();
  persistence.save(createInitialWorldState());
  persistence.createBackup();
  persistence.deleteBackup();
  assert(persistence.hasSave());
  assert(!persistence.hasBackup());
});
