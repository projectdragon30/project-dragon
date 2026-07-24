import { MissionStatus } from "../constants/game-enums.js";
import { calculateDomainTierProgress } from "./domain-progress-service.js";

function evaluateRequirement(state, requirement) {
  switch (requirement.type) {
    case "MISSION_COMPLETED":
      return state.missionInstances.some((instance) =>
        instance.definitionId === requirement.missionDefinitionId && instance.status === MissionStatus.COMPLETED);
    case "DOMAIN_TIER_PROGRESS":
      return calculateDomainTierProgress(state, requirement.domainTierId) >= requirement.minimum;
    case "DOMAIN_TIER_MASTERED":
      return state.domainTiers.some((tier) => tier.id === requirement.domainTierId && tier.status === "MASTERED");
    case "MILESTONE_COMPLETED":
      return state.milestones.some((milestone) => milestone.id === requirement.milestoneId && milestone.status === "COMPLETED");
    case "DOMAIN_CONDITION_NOT":
      return state.domains.some((domain) => domain.id === requirement.domainId && domain.conditionState !== requirement.conditionState);
    case "BOSS_DEFEATED":
      return state.bosses.some((boss) => boss.id === requirement.bossId && boss.status === "DEFEATED");
    default:
      return false;
  }
}

export function evaluateRequirementGroups(state, groups = []) {
  const checks = groups.filter((group) => group.required !== false).map((group) => {
    const results = group.requirements.map((requirement) => ({
      requirement,
      satisfied: evaluateRequirement(state, requirement),
    }));
    return {
      id: group.id,
      mode: group.mode,
      satisfied: group.mode === "ANY" ? results.some((item) => item.satisfied) : results.every((item) => item.satisfied),
      results,
    };
  });
  return {
    available: checks.every((group) => group.satisfied),
    checks,
    blockingReasons: checks.filter((group) => !group.satisfied).map((group) => `Grupo pendiente: ${group.id}.`),
  };
}

export function evaluateBossAvailability(state, bossId) {
  const boss = state.bosses.find((item) => item.id === bossId);
  if (!boss) return { available: false, bossId, checks: [], blockingReasons: [`Jefe inexistente: ${bossId}.`] };
  return { bossId, ...evaluateRequirementGroups(state, boss.requirementGroups) };
}

export function evaluateBossDefeat(state, bossId) {
  const boss = state.bosses.find((item) => item.id === bossId);
  if (!boss) return { available: false, bossId, checks: [], blockingReasons: [`Jefe inexistente: ${bossId}.`] };
  const challengesComplete = boss.challengeMissionIds.every((definitionId) =>
    state.missionInstances.some((instance) => instance.definitionId === definitionId && instance.status === MissionStatus.COMPLETED));
  const groups = evaluateRequirementGroups(state, boss.finalRequirementGroups);
  return {
    available: challengesComplete && groups.available,
    bossId,
    checks: [{ id: "challengeMissionIds", satisfied: challengesComplete }, ...groups.checks],
    blockingReasons: [
      ...(challengesComplete ? [] : ["Existen misiones de desafío pendientes."]),
      ...groups.blockingReasons,
    ],
  };
}
