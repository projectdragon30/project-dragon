import { CommandType, EventType } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import { processMissionRewards } from "../js/services/reward-service.js";
import { assert, equal, test } from "./test-utils.js";

let sequence = 0;
function command(type, payload) {
  sequence += 1;
  return { id: `reward-command-${sequence}`, type, payload, actor: "TEST", requestedAt: "2026-07-23T00:00:00.000Z" };
}

function activeDemoEngine() {
  const engine = new WorldEngine(createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" }), {
    clock: () => "2026-07-23T00:00:01.000Z",
  });
  engine.dispatch(command(CommandType.MAKE_MISSION_AVAILABLE, { missionDefinitionId: "reconocer-piloto-automatico-demo" }));
  const started = engine.dispatch(command(CommandType.START_MISSION, { missionDefinitionId: "reconocer-piloto-automatico-demo" }));
  const missionInstanceId = started.data.missionInstanceId;
  for (const objectiveId of ["identificar-disparador", "identificar-conducta-automatica", "identificar-consecuencia"]) {
    engine.dispatch(command(CommandType.SUBMIT_EVIDENCE, {
      missionInstanceId,
      objectiveId,
      evidence: { level: "SELF_REPORTED", kind: "TEXT", value: `evidencia ${objectiveId}` },
    }));
  }
  engine.dispatch(command(CommandType.UPDATE_OBJECTIVE, {
    missionInstanceId,
    objectiveId: "definir-respuesta-consciente",
    value: "Responder de forma consciente",
  }));
  return { engine, missionInstanceId };
}

test("completar la misión concede recompensa y XP exactamente una vez", () => {
  const { engine, missionInstanceId } = activeDemoEngine();
  const first = engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId }));
  assert(first.success);
  const afterFirst = engine.getSnapshot();
  equal(afterFirst.rewardTransactions.length, 1);
  equal(afterFirst.xpTransactions.length, 1);
  const second = engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId }));
  assert(!second.success);
  equal(engine.getSnapshot().xpTransactions.length, 1);
});

test("COMPLETE_MISSION produce eventos en orden causal", () => {
  const { engine, missionInstanceId } = activeDemoEngine();
  const result = engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId }));
  equal(result.events.map((event) => event.type).join(","), [
    EventType.MISSION_COMPLETED,
    EventType.MISSION_REWARD_GRANTED,
    EventType.XP_GRANTED,
    EventType.DOMAIN_PROGRESS_UPDATED,
  ].join(","));
});

test("reejecutar reward processing no duplica transacciones", () => {
  const state = createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" });
  const definition = state.missionDefinitions[0];
  const instance = { id: "demo-instance", definitionId: definition.id };
  const input = { id: "same-command" };
  processMissionRewards(state, definition, instance, input, "2026-07-23T00:00:01.000Z");
  processMissionRewards(state, definition, instance, input, "2026-07-23T00:00:01.000Z");
  equal(state.rewardTransactions.length, 1);
  equal(state.xpTransactions.length, 1);
});

test("rewardTransaction y xpTransaction se referencian mutuamente", () => {
  const { engine, missionInstanceId } = activeDemoEngine();
  engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId }));
  const state = engine.getSnapshot();
  equal(state.rewardTransactions[0].xpTransactionIds[0], state.xpTransactions[0].id);
  equal(state.xpTransactions[0].rewardTransactionId, state.rewardTransactions[0].id);
});

test("un comando rechazado no concede recompensas", () => {
  const { engine, missionInstanceId } = activeDemoEngine();
  const before = engine.getSnapshot();
  const result = engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId: `${missionInstanceId}-missing` }));
  assert(!result.success);
  equal(engine.getSnapshot().rewardTransactions.length, before.rewardTransactions.length);
});

test("una misión no puede completarse con requisitos pendientes", () => {
  const engine = new WorldEngine(createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" }));
  engine.dispatch(command(CommandType.MAKE_MISSION_AVAILABLE, { missionDefinitionId: "reconocer-piloto-automatico-demo" }));
  const started = engine.dispatch(command(CommandType.START_MISSION, { missionDefinitionId: "reconocer-piloto-automatico-demo" }));
  const result = engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId: started.data.missionInstanceId }));
  assert(!result.success);
  equal(result.errors[0].code, "MISSION_REQUIREMENTS_NOT_MET");
  equal(engine.getSnapshot().rewardTransactions.length, 0);
});

test("evidencia queda registrada sin modificar la definición", () => {
  const engine = new WorldEngine(createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" }));
  const definitionBefore = engine.getSnapshot().missionDefinitions[0];
  engine.dispatch(command(CommandType.MAKE_MISSION_AVAILABLE, { missionDefinitionId: definitionBefore.id }));
  const started = engine.dispatch(command(CommandType.START_MISSION, { missionDefinitionId: definitionBefore.id }));
  const result = engine.dispatch(command(CommandType.SUBMIT_EVIDENCE, {
    missionInstanceId: started.data.missionInstanceId,
    objectiveId: "identificar-disparador",
    evidence: { level: "SELF_REPORTED", kind: "TEXT", value: "registro" },
  }));
  assert(result.success);
  equal(result.events[0].type, EventType.EVIDENCE_SUBMITTED);
  equal(engine.getSnapshot().missionInstances[0].evidenceEntries.length, 1);
  equal(JSON.stringify(engine.getSnapshot().missionDefinitions[0]), JSON.stringify(definitionBefore));
});

test("suscriptores reciben un único lote con todos los eventos de COMPLETE_MISSION", () => {
  const { engine, missionInstanceId } = activeDemoEngine();
  let calls = 0;
  let received = [];
  engine.subscribe((_snapshot, events) => {
    calls += 1;
    received = events;
  });
  engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId }));
  equal(calls, 1);
  equal(received.length, 4);
});

test("estado completado conserva serialización JSON", () => {
  const { engine, missionInstanceId } = activeDemoEngine();
  engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId }));
  const serialized = JSON.stringify(engine.getSnapshot());
  assert(typeof serialized === "string" && serialized.includes("xpTransactions"));
});
