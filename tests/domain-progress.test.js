import { MissionCriticality, MissionStatus } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import {
  calculateDomainTierCompletion,
  calculateDomainTierProgress,
} from "../js/services/domain-progress-service.js";
import { equal, test } from "./test-utils.js";

const tierId = "disciplina-tier-1";

function progressState() {
  const state = createInitialWorldState();
  state.system.missionAvailability["reconocer-piloto-automatico-demo"] = MissionStatus.AVAILABLE;
  return state;
}

test("progreso de Tier no depende de XP", () => {
  const state = progressState();
  const before = calculateDomainTierProgress(state, tierId);
  state.domainTiers.find((tier) => tier.id === tierId).tierXP = 999;
  equal(calculateDomainTierProgress(state, tierId), before);
});

test("Tier progress usa categorías ponderadas y categorías no implementadas aportan 0", () => {
  const state = progressState();
  state.missionInstances.push({
    id: "completed", definitionId: "reconocer-piloto-automatico-demo", status: MissionStatus.COMPLETED,
  });
  equal(calculateDomainTierProgress(state, tierId), 0.7);
});

test("progreso y completitud pueden diferir", () => {
  const state = progressState();
  state.missionInstances.push({
    id: "completed", definitionId: "reconocer-piloto-automatico-demo", status: MissionStatus.COMPLETED,
  });
  equal(calculateDomainTierProgress(state, tierId), 0.7);
  equal(calculateDomainTierCompletion(state, tierId), 1);
});

test("contenido OPTIONAL visible afecta completion pero no progreso obligatorio", () => {
  const state = progressState();
  state.missionDefinitions.push({
    ...state.missionDefinitions[0],
    id: "optional-visible",
    criticality: MissionCriticality.OPTIONAL,
    objectives: [],
    rewards: [],
  });
  state.system.missionAvailability["optional-visible"] = MissionStatus.AVAILABLE;
  state.missionInstances.push({
    id: "completed", definitionId: "reconocer-piloto-automatico-demo", status: MissionStatus.COMPLETED,
  });
  equal(calculateDomainTierProgress(state, tierId), 0.7);
  equal(calculateDomainTierCompletion(state, tierId), 0.5);
});

test("contenido HIDDEN no afecta completion y vacío devuelve 0", () => {
  const state = createInitialWorldState();
  equal(calculateDomainTierCompletion(state, tierId), 0);
  equal(calculateDomainTierCompletion(state, "vida-tier-1"), 0);
});

test("progressConfig suma 100", () => {
  const state = createInitialWorldState();
  const config = state.domainTiers.find((tier) => tier.id === tierId).progressConfig;
  equal(Object.values(config).reduce((sum, weight) => sum + weight, 0), 100);
});
