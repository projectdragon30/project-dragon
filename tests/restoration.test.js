import { CommandType, DomainConditionState } from "../js/constants/game-enums.js";
import { assert, equal, test } from "./test-utils.js";
import { command, createPhase5Engine } from "./phase5-test-helpers.js";

function corrupt(engine) {
  engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "disciplina", conditionState: DomainConditionState.CORRUPTED, exceptional: true, cause: "TEST",
  }));
}

function completeRestorationMission(engine) {
  engine.dispatch(command(CommandType.ACTIVATE_RESTORATION_MISSION, { domainId: "disciplina" }));
  const started = engine.dispatch(command(CommandType.START_MISSION, { missionDefinitionId: "restauracion-disciplina-demo" }));
  for (const objectiveId of ["identificar-causa-demo", "ejecutar-accion-correctiva-demo", "registrar-evidencia-demo", "confirmar-estabilidad-demo"]) {
    engine.dispatch(command(CommandType.SUBMIT_EVIDENCE, {
      missionInstanceId: started.data.missionInstanceId, objectiveId,
      evidence: { level: "SELF_REPORTED", kind: "TEXT", value: "evidencia DEMO" },
    }));
  }
  engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId: started.data.missionInstanceId }));
}

test("STABLE no activa restauración y STRAINED sí", () => {
  const engine = createPhase5Engine();
  assert(!engine.dispatch(command(CommandType.ACTIVATE_RESTORATION_MISSION, { domainId: "disciplina" })).success);
  engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, { domainId: "disciplina", conditionState: "STRAINED" }));
  assert(engine.dispatch(command(CommandType.ACTIVATE_RESTORATION_MISSION, { domainId: "disciplina" })).success);
});

test("CORRUPTED exige RECOVERING y misión completa", () => {
  const engine = createPhase5Engine();
  corrupt(engine);
  assert(!engine.dispatch(command(CommandType.COMPLETE_DOMAIN_RESTORATION, { domainId: "disciplina" })).success);
  engine.dispatch(command(CommandType.START_DOMAIN_RECOVERY, { domainId: "disciplina" }));
  assert(!engine.dispatch(command(CommandType.COMPLETE_DOMAIN_RESTORATION, { domainId: "disciplina" })).success);
});

test("señal crítica activa bloquea restauración", () => {
  const engine = createPhase5Engine();
  corrupt(engine);
  completeRestorationMission(engine);
  engine.dispatch(command(CommandType.START_DOMAIN_RECOVERY, { domainId: "disciplina" }));
  engine.dispatch(command(CommandType.RECORD_CONDITION_SIGNAL, {
    id: "critical-restoration", domainId: "disciplina", type: "NEGATIVE", severity: "CRITICAL", sourceType: "TEST", sourceId: "critical",
  }));
  assert(!engine.dispatch(command(CommandType.COMPLETE_DOMAIN_RESTORATION, { domainId: "disciplina" })).success);
});

test("requisitos completos permiten RECOVERING a STABLE sin XP y con contribución", () => {
  const engine = createPhase5Engine();
  corrupt(engine);
  completeRestorationMission(engine);
  engine.dispatch(command(CommandType.START_DOMAIN_RECOVERY, { domainId: "disciplina" }));
  const xpBefore = engine.getSnapshot().xpTransactions.length;
  const result = engine.dispatch(command(CommandType.COMPLETE_DOMAIN_RESTORATION, { domainId: "disciplina" }));
  assert(result.success);
  equal(engine.getSnapshot().domains.find((item) => item.id === "disciplina").conditionState, DomainConditionState.STABLE);
  equal(engine.getSnapshot().xpTransactions.length, xpBefore);
  equal(engine.getSnapshot().contributions.filter((item) => item.contributionType === "RESTORATION_COMPLETED").length, 1);
});

test("deterioro nuevo interrumpe RECOVERING", () => {
  const engine = createPhase5Engine();
  corrupt(engine);
  engine.dispatch(command(CommandType.START_DOMAIN_RECOVERY, { domainId: "disciplina" }));
  engine.dispatch(command(CommandType.RECORD_CONDITION_SIGNAL, {
    domainId: "disciplina", type: "NEGATIVE", severity: "CRITICAL", sourceType: "TEST", sourceId: "new",
  }));
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_CONDITION, { domainId: "disciplina" }));
  equal(engine.getSnapshot().domains.find((item) => item.id === "disciplina").conditionState, DomainConditionState.CORRUPTED);
});
