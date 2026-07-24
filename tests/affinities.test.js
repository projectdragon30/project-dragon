import { CommandType } from "../js/constants/game-enums.js";
import { selectAffinityEvaluation } from "../js/selectors/world-selectors.js";
import { assert, equal, test } from "./test-utils.js";
import { command, createPhase5Engine } from "./phase5-test-helpers.js";

test("afinidad dirigida no implica dirección inversa", () => {
  const engine = createPhase5Engine();
  engine.dispatch(command(CommandType.ACTIVATE_AFFINITY, { affinityId: "afinidad-mente-disciplina-demo" }));
  equal(engine.select(selectAffinityEvaluation, "disciplina").incoming.length, 1);
  equal(engine.select(selectAffinityEvaluation, "mente").incoming.length, 0);
});

test("activar y desactivar afinidad valida transiciones", () => {
  const engine = createPhase5Engine();
  assert(engine.dispatch(command(CommandType.ACTIVATE_AFFINITY, { affinityId: "afinidad-mente-disciplina-demo" })).success);
  assert(!engine.dispatch(command(CommandType.ACTIVATE_AFFINITY, { affinityId: "afinidad-mente-disciplina-demo" })).success);
  assert(engine.dispatch(command(CommandType.DEACTIVATE_AFFINITY, { affinityId: "afinidad-mente-disciplina-demo" })).success);
});

test("modificadores permanecen limitados", () => {
  const engine = createPhase5Engine();
  engine.dispatch(command(CommandType.ACTIVATE_AFFINITY, { affinityId: "afinidad-mente-disciplina-demo" }));
  const modifiers = engine.select(selectAffinityEvaluation, "disciplina").modifiers;
  assert(Object.values(modifiers).every((value) => value >= -0.5 && value <= 0.5));
});

test("afinidad no cambia XP, progresión ni maestría", () => {
  const engine = createPhase5Engine();
  const before = engine.getSnapshot();
  engine.dispatch(command(CommandType.ACTIVATE_AFFINITY, { affinityId: "afinidad-mente-disciplina-demo" }));
  const after = engine.getSnapshot();
  equal(JSON.stringify(after.xpTransactions), JSON.stringify(before.xpTransactions));
  equal(JSON.stringify(after.domains), JSON.stringify(before.domains));
});

test("modificar selector de afinidad no altera estado", () => {
  const engine = createPhase5Engine();
  engine.dispatch(command(CommandType.ACTIVATE_AFFINITY, { affinityId: "afinidad-mente-disciplina-demo" }));
  const result = engine.select(selectAffinityEvaluation, "disciplina");
  result.modifiers.recoveryModifier = 99;
  assert(engine.select(selectAffinityEvaluation, "disciplina").modifiers.recoveryModifier !== 99);
});
