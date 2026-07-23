import {
  createInitialWorldState,
  deserializeWorldState,
  serializeWorldState,
} from "../js/core/state-factory.js";
import { DomainProgressionState } from "../js/constants/game-enums.js";
import { assert, collectForbiddenValues, deepEqual, equal, test } from "./test-utils.js";

test("crea el World State inicial sin errores", () => {
  const state = createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" });
  equal(state.schemaVersion, "1.0.0");
  equal(state.currentWorldLevelId, "awakening");
});

test("serializa y deserializa conservando la estructura", () => {
  const state = createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" });
  deepEqual(deserializeWorldState(serializeWorldState(state)), state);
});

test("incluye exactamente los ocho Dominios obligatorios", () => {
  const state = createInitialWorldState();
  const ids = state.domains.map((domain) => domain.id).sort();
  deepEqual(ids, ["disciplina", "imperio", "legado", "mente", "proposito", "relaciones", "sabiduria", "vida"]);
});

test("Legado usa progressionState CONSEQUENCE", () => {
  const state = createInitialWorldState();
  const legado = state.domains.find((domain) => domain.id === "legado");
  equal(legado.progressionState, DomainProgressionState.CONSEQUENCE);
});

test("la misión demo contiene cuatro objetivos obligatorios con peso total 100", () => {
  const state = createInitialWorldState();
  const mission = state.missionDefinitions.find(
    (definition) => definition.id === "reconocer-piloto-automatico-demo",
  );
  equal(mission.objectives.length, 4);
  assert(mission.objectives.every((objective) => objective.required));
  equal(mission.objectives.reduce((total, objective) => total + objective.weight, 0), 100);
});

test("el estado inicial no contiene Date, funciones ni referencias circulares", () => {
  const state = createInitialWorldState();
  deepEqual(collectForbiddenValues(state), []);
});
