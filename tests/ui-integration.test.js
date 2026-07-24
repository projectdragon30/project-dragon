import { MemoryStorageAdapter } from "../js/adapters/memory-storage-adapter.js";
import { prepareEngine } from "../js/app/bootstrap.js";
import { MissionController } from "../js/controllers/mission-controller.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import { PersistenceService } from "../js/services/persistence-service.js";
import { assert, equal, test } from "./test-utils.js";

function createContext(adapter) {
  const persistence = new PersistenceService(adapter, {
    clock: () => "2026-07-24T00:00:00.000Z",
  });
  const engine = new WorldEngine(createInitialWorldState(), {
    persistenceService: persistence,
    autosave: { enabled: true },
  });
  return {
    persistence,
    engine,
    notifications: { show() {} },
  };
}

test("flujo UI completo persiste la misión demo y sus recompensas una sola vez", () => {
  const adapter = new MemoryStorageAdapter();
  const context = createContext(adapter);
  prepareEngine(context);

  const controller = new MissionController(context.engine, context.notifications, {
    clock: () => "2026-07-24T00:00:01.000Z",
  });
  const started = controller.startMission("reconocer-piloto-automatico-demo");
  assert(started.success);
  const missionInstanceId = started.data.missionInstanceId;

  for (const objectiveId of [
    "identificar-disparador",
    "identificar-conducta-automatica",
    "identificar-consecuencia",
  ]) {
    assert(controller.submitEvidence(missionInstanceId, objectiveId, `Evidencia ${objectiveId}`).success);
  }
  assert(controller.updateObjective(
    missionInstanceId,
    "definir-respuesta-consciente",
    "Responder de forma consciente",
  ).success);
  assert(controller.completeMission(missionInstanceId).success);

  const completed = context.engine.getSnapshot();
  equal(completed.domains.find((domain) => domain.id === "disciplina").totalXP, 10);
  equal(completed.rewardTransactions.length, 1);
  equal(completed.xpTransactions.length, 1);
  equal(completed.contributions.length, 1);

  const reloaded = createContext(adapter);
  prepareEngine(reloaded);
  const persisted = reloaded.engine.getSnapshot();
  equal(persisted.missionInstances.find((mission) => mission.id === missionInstanceId).status, "COMPLETED");
  equal(persisted.domains.find((domain) => domain.id === "disciplina").totalXP, 10);
  equal(persisted.rewardTransactions.length, 1);
  equal(persisted.xpTransactions.length, 1);
  equal(persisted.contributions.length, 1);
});
