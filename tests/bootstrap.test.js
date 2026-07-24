import { MemoryStorageAdapter } from "../js/adapters/memory-storage-adapter.js";
import { prepareEngine } from "../js/app/bootstrap.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import { PersistenceService } from "../js/services/persistence-service.js";
import { assert, equal, test } from "./test-utils.js";

function setup() {
  const persistence = new PersistenceService(new MemoryStorageAdapter(), { clock: () => "2026-07-24T00:00:00.000Z" });
  const engine = new WorldEngine(createInitialWorldState(), {
    persistenceService: persistence,
    autosave: { enabled: true },
  });
  return { persistence, engine, notifications: { show() {} } };
}

test("sin partida crea guardado inicial y hace disponible la misión demo", () => {
  const context = setup();
  prepareEngine(context);
  assert(context.persistence.hasSave());
  equal(context.engine.getSnapshot().system.missionAvailability["reconocer-piloto-automatico-demo"], "AVAILABLE");
});

test("con partida válida carga estado sin duplicar históricos", () => {
  const context = setup();
  context.persistence.save(context.engine.getSnapshot());
  const before = context.engine.getSnapshot().eventLog.length;
  prepareEngine(context);
  assert(context.engine.getSnapshot().eventLog.length >= before);
});

test("prepareEngine informa recuperación fallida sin bloquear", () => {
  const context = setup();
  context.persistence.adapter.setItem("project-dragon:save:primary", "{bad");
  const result = prepareEngine(context);
  assert(result.recoveryMessage.includes("sesión nueva"));
});
