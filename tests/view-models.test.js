import { createInitialWorldState } from "../js/core/state-factory.js";
import { regions } from "../js/data/regiones.js";
import { createDomainViewModel } from "../js/view-models/domain-view-model.js";
import { createMissionViewModel } from "../js/view-models/mission-view-model.js";
import { assert, equal, test } from "./test-utils.js";

test("Domain ACTIVE produce estado visual active", () => {
  const state = createInitialWorldState();
  const vm = createDomainViewModel(state, regions.find((item) => item.domainId === "disciplina"));
  assert(vm.visualState.includes("active"));
  equal(vm.totalXP, 0);
});

test("Domain MASTERED y CORRUPTED conserva ambos estados", () => {
  const state = createInitialWorldState();
  const domain = state.domains.find((item) => item.id === "disciplina");
  domain.progressionState = "MASTERED"; domain.conditionState = "CORRUPTED";
  const vm = createDomainViewModel(state, regions.find((item) => item.domainId === domain.id));
  assert(vm.isMastered && vm.isCorrupted);
  assert(vm.visualState.includes("mastered") && vm.visualState.includes("corrupted"));
});

test("FUTURE produce estado futuro y progreso/completitud separados", () => {
  const state = createInitialWorldState();
  const vm = createDomainViewModel(state, regions.find((item) => item.domainId === "relaciones"));
  assert(vm.isFuture);
  assert(typeof vm.progress === "number" && typeof vm.completion === "number");
});

test("misión AVAILABLE permite iniciar y recompensa DEMO no inventa narrativa", () => {
  const state = createInitialWorldState();
  const definition = state.missionDefinitions.find((item) => item.id === "reconocer-piloto-automatico-demo");
  state.system.missionAvailability[definition.id] = "AVAILABLE";
  const vm = createMissionViewModel(state, definition);
  assert(vm.canStart && vm.isDemo);
  equal(vm.rewardSummary, "10 XP · DEMO");
});

test("View Models no alteran World State", () => {
  const state = createInitialWorldState();
  const before = JSON.stringify(state);
  const vm = createDomainViewModel(state, regions[0]);
  vm.totalXP = 999;
  equal(JSON.stringify(state), before);
});
