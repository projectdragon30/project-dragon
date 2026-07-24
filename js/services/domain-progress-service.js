import { MissionCriticality, MissionStatus } from "../constants/game-enums.js";
import { clampProgress } from "./mission-progress-service.js";

function missionsForTier(state, tierId) {
  return state.missionDefinitions.filter((definition) => definition.primaryDomainTierId === tierId);
}

function completionForDefinitions(state, definitions) {
  if (definitions.length === 0) return 0;
  const completed = definitions.filter((definition) =>
    state.missionInstances.some(
      (instance) => instance.definitionId === definition.id && instance.status === MissionStatus.COMPLETED,
    )).length;
  return clampProgress(completed / definitions.length);
}

export function calculateDomainTierProgress(state, tierId) {
  const tier = state.domainTiers.find((candidate) => candidate.id === tierId);
  if (!tier) return 0;
  const definitions = missionsForTier(state, tierId);
  const categories = {
    coreMissions: completionForDefinitions(
      state,
      definitions.filter((definition) => definition.criticality === MissionCriticality.CORE),
    ),
    masteryMissions: completionForDefinitions(
      state,
      definitions.filter((definition) => definition.criticality === MissionCriticality.MASTERY),
    ),
    milestones: completionForItems(
      state.milestones.filter((milestone) => milestone.domainTierId === tierId),
      (milestone) => milestone.status === "COMPLETED",
    ),
    bossContribution: completionForItems(
      state.bosses.filter((boss) =>
        boss.requirementGroups?.some((group) =>
          group.requirements?.some((requirement) => requirement.domainTierId === tierId))),
      (boss) => boss.status === "DEFEATED",
    ),
  };
  return clampProgress(Object.entries(tier.progressConfig).reduce(
    (sum, [category, weight]) => sum + (categories[category] ?? 0) * weight,
    0,
  ) / 100);
}

function completionForItems(items, predicate) {
  if (items.length === 0) return 0;
  return clampProgress(items.filter(predicate).length / items.length);
}

export function calculateDomainTierCompletion(state, tierId) {
  const visible = missionsForTier(state, tierId).filter((definition) => {
    const availability = state.system.missionAvailability[definition.id];
    return availability !== MissionStatus.HIDDEN && availability !== "FUTURE";
  });
  return completionForDefinitions(state, visible);
}
