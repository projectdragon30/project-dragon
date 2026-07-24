import { MemoryStorageAdapter } from "../js/adapters/memory-storage-adapter.js";
import { CommandType } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import { PersistenceService } from "../js/services/persistence-service.js";
import { MAX_IMPORT_SIZE } from "../js/validators/import-validator.js";
import { assert, equal, test } from "./test-utils.js";
import { command } from "./phase5-test-helpers.js";

function setup() {
  const persistence = new PersistenceService(new MemoryStorageAdapter(), {
    clock: () => "2026-07-24T00:00:00.000Z", idFactory: () => "portable-save",
  });
  const engine = new WorldEngine(createInitialWorldState(), { persistenceService: persistence });
  return { engine, persistence };
}

test("export devuelve JSON sin modificar el estado y realiza round-trip", () => {
  const { engine } = setup();
  engine.save();
  const before = JSON.stringify(engine.getSnapshot());
  const exported = engine.exportSave();
  assert(exported.ok && typeof exported.value === "string");
  const other = setup().engine;
  assert(other.importSave(exported.value).ok);
  equal(JSON.stringify(other.getSnapshot()), before);
  equal(JSON.stringify(engine.getSnapshot()), before);
});

test("importación alterada, formato incorrecto y tamaño excesivo conservan estado", () => {
  const { engine } = setup();
  engine.save();
  const before = JSON.stringify(engine.getSnapshot());
  const envelope = JSON.parse(engine.exportSave().value);
  envelope.state.player.id = "tampered";
  assert(!engine.importSave(JSON.stringify(envelope)).ok);
  assert(!engine.importSave("{}").ok);
  assert(!engine.importSave("x".repeat(MAX_IMPORT_SIZE + 1)).ok);
  equal(JSON.stringify(engine.getSnapshot()), before);
});

test("motor sin persistencia mantiene gameplay y rechaza capacidad", () => {
  const engine = new WorldEngine(createInitialWorldState());
  equal(engine.save().error.code, "PERSISTENCE_NOT_CONFIGURED");
  assert(engine.dispatch(command(CommandType.MAKE_MISSION_AVAILABLE, { missionDefinitionId: "reconocer-piloto-automatico-demo" })).success);
});

test("reset exige confirmación y conserva backup", () => {
  const { engine, persistence } = setup();
  engine.save(); engine.save();
  assert(!engine.resetWorld().ok);
  assert(!engine.resetWorld({ confirmation: "wrong" }).ok);
  assert(engine.resetWorld({ confirmation: "RESET_PROJECT_DRAGON" }).ok);
  assert(persistence.hasBackup());
  JSON.stringify(engine.getSnapshot());
});

test("autosave solo ocurre tras comando válido cuando está habilitado", () => {
  const storage = new MemoryStorageAdapter();
  const persistence = new PersistenceService(storage, { clock: () => "2026-07-24T00:00:00.000Z" });
  const engine = new WorldEngine(createInitialWorldState(), { persistenceService: persistence, autosave: { enabled: true } });
  assert(!persistence.hasSave());
  engine.select((state) => state.player);
  assert(!persistence.hasSave());
  engine.dispatch(command(CommandType.MAKE_MISSION_AVAILABLE, { missionDefinitionId: "reconocer-piloto-automatico-demo" }));
  assert(persistence.hasSave());
  const text = engine.exportSave().value;
  engine.dispatch(command(CommandType.MAKE_MISSION_AVAILABLE, { missionDefinitionId: "reconocer-piloto-automatico-demo" }));
  equal(engine.exportSave().value, text);
});
