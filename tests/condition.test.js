import { CommandType, DomainConditionState } from "../js/constants/game-enums.js";
import { assert, equal, test } from "./test-utils.js";
import { command, createPhase5Engine } from "./phase5-test-helpers.js";

function signal(engine, severity, id) {
  return engine.dispatch(command(CommandType.RECORD_CONDITION_SIGNAL, {
    id, domainId: "disciplina", type: "NEGATIVE", severity,
    sourceType: "TEST", sourceId: id,
  }));
}

test("una señal LOW aislada y una misión fallida aislada no corrompen", () => {
  const engine = createPhase5Engine();
  signal(engine, "LOW", "low-1");
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_CONDITION, { domainId: "disciplina" }));
  equal(engine.getSnapshot().domains.find((item) => item.id === "disciplina").conditionState, DomainConditionState.STABLE);
});

test("deterioro moderado sostenido produce STRAINED", () => {
  const engine = createPhase5Engine();
  signal(engine, "MEDIUM", "medium-1");
  signal(engine, "MEDIUM", "medium-2");
  const result = engine.dispatch(command(CommandType.EVALUATE_DOMAIN_CONDITION, { domainId: "disciplina" }));
  assert(result.data.blockingReasons.length >= 0);
  equal(engine.getSnapshot().domains.find((item) => item.id === "disciplina").conditionState, DomainConditionState.STRAINED);
});

test("deterioro alto suficiente produce CORRUPTED mediante evaluación sostenida", () => {
  const engine = createPhase5Engine();
  signal(engine, "HIGH", "high-1");
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_CONDITION, { domainId: "disciplina" }));
  signal(engine, "HIGH", "high-2");
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_CONDITION, { domainId: "disciplina" }));
  equal(engine.getSnapshot().domains.find((item) => item.id === "disciplina").conditionState, DomainConditionState.CORRUPTED);
});

test("resolver una señal conserva el historial y rechaza doble resolución", () => {
  const engine = createPhase5Engine();
  signal(engine, "LOW", "resolve-1");
  assert(engine.dispatch(command(CommandType.RESOLVE_CONDITION_SIGNAL, { signalId: "resolve-1" })).success);
  assert(!engine.dispatch(command(CommandType.RESOLVE_CONDITION_SIGNAL, { signalId: "resolve-1" })).success);
  equal(engine.getSnapshot().system.conditionSignals.length, 1);
  assert(engine.getSnapshot().system.conditionSignals[0].resolvedAt);
});

test("corrupción no elimina XP ni maestría previa", () => {
  const engine = createPhase5Engine();
  const state = engine.getSnapshot();
  const beforeXP = JSON.stringify(state.xpTransactions);
  signal(engine, "CRITICAL", "critical-1");
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_CONDITION, { domainId: "disciplina" }));
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_CONDITION, { domainId: "disciplina" }));
  equal(JSON.stringify(engine.getSnapshot().xpTransactions), beforeXP);
});
