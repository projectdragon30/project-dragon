import { MemoryStorageAdapter } from "../js/adapters/memory-storage-adapter.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { PersistenceService, STORAGE_KEYS } from "../js/services/persistence-service.js";
import { assert, equal, test } from "./test-utils.js";

function service(storage = new MemoryStorageAdapter()) {
  let tick = 0;
  return new PersistenceService(storage, {
    clock: () => `2026-07-24T00:00:0${tick++}.000Z`,
    idFactory: () => "save-test",
  });
}

test("guardar crea envelope válido y permite recuperar copia independiente", () => {
  const persistence = service();
  const state = createInitialWorldState();
  const saved = persistence.save(state);
  assert(saved.ok);
  equal(saved.value.format, "PROJECT_DRAGON_SAVE");
  equal(saved.value.formatVersion, 1);
  const loaded = persistence.load();
  assert(loaded.ok);
  loaded.value.player.id = "changed";
  assert(persistence.load().value.player.id !== "changed");
});

test("saveId y createdAt permanecen; updatedAt cambia y se crea backup", () => {
  const persistence = service();
  const state = createInitialWorldState();
  const first = persistence.save(state).value;
  const second = persistence.save(state).value;
  equal(first.saveId, second.saveId);
  equal(first.createdAt, second.createdAt);
  assert(first.updatedAt !== second.updatedAt);
  assert(persistence.hasBackup());
});

test("estado inválido se rechaza y no reemplaza primaria", () => {
  const persistence = service();
  const state = createInitialWorldState();
  persistence.save(state);
  const before = persistence.exportSave().value;
  const invalid = JSON.parse(JSON.stringify(state));
  invalid.domains[0].progressionState = "INVALID";
  assert(!persistence.save(invalid).ok);
  equal(persistence.exportSave().value, before);
});

test("JSON, checksum y envelope inválidos se rechazan", () => {
  const persistence = service();
  equal(persistence.deserializeSave("{").error.code, "SAVE_DESERIALIZATION_FAILED");
  const state = createInitialWorldState();
  persistence.save(state);
  const envelope = JSON.parse(persistence.exportSave().value);
  envelope.state.player.id = "tampered";
  equal(persistence.deserializeSave(JSON.stringify(envelope)).error.code, "SAVE_CHECKSUM_MISMATCH");
  equal(persistence.deserializeSave("{}").error.code, "INVALID_SAVE_FORMAT");
});

test("deleteSave conserva backup", () => {
  const persistence = service();
  const state = createInitialWorldState();
  persistence.save(state); persistence.save(state);
  persistence.deleteSave();
  assert(!persistence.hasSave());
  assert(persistence.hasBackup());
});

test("namespace y claves son exclusivos", () => {
  equal(STORAGE_KEYS.primary, "project-dragon:save:primary");
  equal(STORAGE_KEYS.backup, "project-dragon:save:backup");
});
