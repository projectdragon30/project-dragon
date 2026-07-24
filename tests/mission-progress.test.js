import { ObjectiveType } from "../js/constants/game-enums.js";
import {
  calculateMissionProgress,
  calculateObjectiveProgress,
  validateObjectiveValue,
} from "../js/services/mission-progress-service.js";
import { assert, equal, test } from "./test-utils.js";

const numeric = (type, target = 4) => ({ id: "numeric", type, target });

test("BOOLEAN false = 0 y true = 1", () => {
  equal(calculateObjectiveProgress({ id: "b", type: ObjectiveType.BOOLEAN }, false), 0);
  equal(calculateObjectiveProgress({ id: "b", type: ObjectiveType.BOOLEAN }, true), 1);
});

test("COUNT parcial produce fracción y se limita a 1", () => {
  equal(calculateObjectiveProgress(numeric(ObjectiveType.COUNT), 2), 0.5);
  equal(calculateObjectiveProgress(numeric(ObjectiveType.COUNT), 9), 1);
});

test("STREAK y THRESHOLD usan un target válido", () => {
  equal(calculateObjectiveProgress(numeric(ObjectiveType.STREAK), 1), 0.25);
  equal(calculateObjectiveProgress(numeric(ObjectiveType.THRESHOLD), 3), 0.75);
});

test("CHECKLIST calcula únicamente elementos requeridos", () => {
  const objective = { id: "list", type: ObjectiveType.CHECKLIST, requiredItems: ["a", "b", "c"] };
  equal(calculateObjectiveProgress(objective, ["a", "c", "extra"]), 2 / 3);
});

test("EVIDENCE requiere una entrada válida", () => {
  const objective = {
    id: "e",
    type: ObjectiveType.EVIDENCE,
    evidenceLevel: "SELF_REPORTED",
    responseFormat: "TEXT",
  };
  equal(calculateObjectiveProgress(objective, null, []), 0);
  equal(calculateObjectiveProgress(objective, null, [{
    objectiveId: "e",
    evidence: { level: "SELF_REPORTED", kind: "TEXT", value: "observación" },
  }]), 1);
});

test("DECISION rechaza texto vacío y acepta una decisión", () => {
  const objective = { id: "d", type: ObjectiveType.DECISION };
  assert(!validateObjectiveValue(objective, "   "));
  assert(validateObjectiveValue(objective, "Actuar conscientemente"));
});

test("un valor incompatible con ObjectiveType se rechaza", () => {
  assert(!validateObjectiveValue(numeric(ObjectiveType.COUNT), "2"));
  assert(!validateObjectiveValue(numeric(ObjectiveType.STREAK), 1.5));
});

test("progreso de misión usa solo objetivos obligatorios y escala 0..1", () => {
  const definition = {
    objectives: [
      { id: "a", type: ObjectiveType.BOOLEAN, required: true, weight: 50 },
      { id: "b", type: ObjectiveType.COUNT, target: 2, required: true, weight: 50 },
      { id: "optional", type: ObjectiveType.BOOLEAN, required: false, weight: 100 },
    ],
  };
  const instance = { objectiveProgress: { a: true, b: 1, optional: true }, evidenceEntries: [] };
  equal(calculateMissionProgress(definition, instance), 0.75);
});
