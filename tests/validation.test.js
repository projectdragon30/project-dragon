import { createInitialWorldState } from "../js/core/state-factory.js";
import { validateWorldState } from "../js/validators/world-state-validator.js";
import { assert, clone, equal, test } from "./test-utils.js";

function hasError(result, code, pathFragment) {
  return result.errors.some(
    (error) => error.code === code && (!pathFragment || error.path.includes(pathFragment)),
  );
}

test("rechaza una referencia a un Dominio inexistente", () => {
  const state = clone(createInitialWorldState());
  state.domainTiers[0].domainId = "dominio-inexistente";
  const result = validateWorldState(state);
  assert(!result.valid);
  assert(hasError(result, "INVALID_REFERENCE", "domainTiers[0].domainId"));
});

test("rechaza objetivos obligatorios cuyos pesos no suman 100", () => {
  const state = clone(createInitialWorldState());
  state.missionDefinitions[0].objectives[0].weight = 20;
  const result = validateWorldState(state);
  assert(!result.valid);
  assert(hasError(result, "INVALID_OBJECTIVE_WEIGHT", "objectives"));
});

test("rechaza un enum inválido", () => {
  const state = clone(createInitialWorldState());
  state.domains[0].progressionState = "INVALID";
  const result = validateWorldState(state);
  assert(!result.valid);
  assert(hasError(result, "INVALID_ENUM", "progressionState"));
});

test("rechaza identificadores globales repetidos", () => {
  const state = clone(createInitialWorldState());
  state.bosses[0].id = state.domains[0].id;
  const result = validateWorldState(state);
  assert(!result.valid);
  assert(hasError(result, "DUPLICATE_GLOBAL_ID", "bosses[0].id"));
});

test("rechaza objetos Date", () => {
  const state = createInitialWorldState();
  state.metadata.createdAt = new Date();
  const result = validateWorldState(state);
  assert(!result.valid);
  assert(hasError(result, "NON_SERIALIZABLE_DATE", "metadata.createdAt"));
});

test("rechaza funciones", () => {
  const state = createInitialWorldState();
  state.system.callback = () => {};
  const result = validateWorldState(state);
  assert(!result.valid);
  assert(hasError(result, "NON_SERIALIZABLE_FUNCTION", "system.callback"));
});

test("devuelve errores estructurados y comprensibles", () => {
  const state = clone(createInitialWorldState());
  state.currentWorldLevelId = "nivel-inexistente";
  const result = validateWorldState(state);
  const error = result.errors.find((entry) => entry.path === "$.currentWorldLevelId");
  equal(error.code, "INVALID_REFERENCE");
  assert(typeof error.message === "string" && error.message.length > 0);
});
