import { regions } from "../data/regiones.js";
import { createDomainViewModel } from "./domain-view-model.js";
import { createBossViewModel } from "./boss-view-model.js";

export function createWorldViewModel(state) {
  return {
    level: state.worldLevels.find((item) => item.id === state.currentWorldLevelId),
    domains: regions.map((region) => createDomainViewModel(state, region)).filter(Boolean),
    boss: createBossViewModel(state, "piloto-automatico"),
  };
}
