import { CommandType, EventType, MissionStatus } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import { assert, deepEqual, equal, test } from "./test-utils.js";

const definitionId = "reconocer-piloto-automatico-demo";
let missionCommandSequence = 0;

function command(type, payload) {
  missionCommandSequence += 1;
  return {
    id: `mission-command-${missionCommandSequence}`,
    type,
    payload,
    actor: "TEST",
    requestedAt: "2026-07-23T00:00:00.000Z",
  };
}

function createMissionEngine() {
  return new WorldEngine(
    createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" }),
    { clock: () => "2026-07-23T00:00:01.000Z" },
  );
}

function makeAvailable(engine) {
  return engine.dispatch(command(CommandType.MAKE_MISSION_AVAILABLE, { missionDefinitionId: definitionId }));
}

function startMission(engine) {
  makeAvailable(engine);
  return engine.dispatch(command(CommandType.START_MISSION, { missionDefinitionId: definitionId }));
}

function satisfyDemoMission(engine, missionInstanceId) {
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
    value: "Respuesta consciente",
  }));
}

test("una misión disponible puede iniciar una instancia ACTIVE", () => {
  const engine = createMissionEngine();
  const result = startMission(engine);
  assert(result.success);
  equal(result.data.attemptNumber, 1);
  equal(result.data.status, MissionStatus.ACTIVE);
  equal(result.events[0].type, EventType.MISSION_STARTED);
  assert(typeof engine.getSnapshot().missionInstances[0].startedAt === "string");
});

test("START_MISSION no modifica la definición", () => {
  const engine = createMissionEngine();
  const before = engine.getSnapshot().missionDefinitions[0];
  startMission(engine);
  deepEqual(engine.getSnapshot().missionDefinitions[0], before);
});

for (const [label, commandType, status, eventType] of [
  ["completarse", CommandType.COMPLETE_MISSION, MissionStatus.COMPLETED, EventType.MISSION_COMPLETED],
  ["fallar", CommandType.FAIL_MISSION, MissionStatus.FAILED, EventType.MISSION_FAILED],
  ["abandonarse", CommandType.ABANDON_MISSION, MissionStatus.ABANDONED, EventType.MISSION_ABANDONED],
  ["expirar", CommandType.EXPIRE_MISSION, MissionStatus.EXPIRED, EventType.MISSION_EXPIRED],
]) {
  test(`una instancia ACTIVE puede ${label}`, () => {
    const engine = createMissionEngine();
    const started = startMission(engine);
    if (commandType === CommandType.COMPLETE_MISSION) satisfyDemoMission(engine, started.data.missionInstanceId);
    const result = engine.dispatch(command(commandType, { missionInstanceId: started.data.missionInstanceId }));
    assert(result.success);
    equal(result.data.status, status);
    equal(result.events[0].type, eventType);
  });
}

test("una instancia completada no puede volver a cambiar", () => {
  const engine = createMissionEngine();
  const started = startMission(engine);
  satisfyDemoMission(engine, started.data.missionInstanceId);
  engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId: started.data.missionInstanceId }));
  const result = engine.dispatch(command(CommandType.FAIL_MISSION, { missionInstanceId: started.data.missionInstanceId }));
  assert(!result.success);
  equal(result.errors[0].code, "MISSION_ALREADY_CLOSED");
});

test("el reintento no está implementado", () => {
  const engine = createMissionEngine();
  const result = engine.dispatch(command("CREATE_MISSION_RETRY", { missionDefinitionId: definitionId }));
  assert(!result.success);
  equal(result.errors[0].code, "INVALID_COMMAND");
});

test("COMPLETE_MISSION concede únicamente la recompensa XP DEMO declarada", () => {
  const engine = createMissionEngine();
  const started = startMission(engine);
  satisfyDemoMission(engine, started.data.missionInstanceId);
  engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId: started.data.missionInstanceId }));
  const snapshot = engine.getSnapshot();
  equal(snapshot.xpTransactions.length, 1);
  equal(snapshot.rewardTransactions.length, 1);
  equal(snapshot.xpTransactions[0].amount, 10);
});

test("REVEAL_MISSION usa disponibilidad runtime sin mutar la definición", () => {
  const engine = createMissionEngine();
  const before = engine.getSnapshot().missionDefinitions[0];
  const result = engine.dispatch(command(CommandType.REVEAL_MISSION, { missionDefinitionId: definitionId }));
  assert(result.success);
  equal(engine.getSnapshot().system.missionAvailability[definitionId], MissionStatus.LOCKED);
  deepEqual(engine.getSnapshot().missionDefinitions[0], before);
});
