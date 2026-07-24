import { evaluateWorldLevelCompletion } from "../js/services/world-level-service.js";
import { assert, equal, test } from "./test-utils.js";
import {
  challengeAndDefeatBoss,
  completeCoreMission,
  completeDemoMilestone,
  createPhase5Engine,
} from "./phase5-test-helpers.js";

test("Nivel I ofrece progreso parcial sin completarse prematuramente", () => {
  const engine = createPhase5Engine();
  equal(evaluateWorldLevelCompletion(engine.getSnapshot(), "awakening").progress, 0);
  completeCoreMission(engine);
  const evaluation = evaluateWorldLevelCompletion(engine.getSnapshot(), "awakening");
  assert(evaluation.progress > 0 && evaluation.progress < 1);
  assert(!evaluation.completed);
});

test("derrotar al jefe modifica el progreso del Nivel I", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  const before = evaluateWorldLevelCompletion(engine.getSnapshot(), "awakening").progress;
  challengeAndDefeatBoss(engine);
  const after = evaluateWorldLevelCompletion(engine.getSnapshot(), "awakening").progress;
  assert(after > before);
});

test("contenido DEMO no completa Nivel I ni desbloquea Nivel II", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  completeDemoMilestone(engine);
  challengeAndDefeatBoss(engine);
  const evaluation = evaluateWorldLevelCompletion(engine.getSnapshot(), "awakening");
  assert(!evaluation.completed);
  equal(engine.getSnapshot().worldLevels.length, 1);
});

test("nivel inexistente evita división entre cero", () => {
  const evaluation = evaluateWorldLevelCompletion(createPhase5Engine().getSnapshot(), "missing");
  equal(evaluation.progress, 0);
  assert(!evaluation.completed);
});
