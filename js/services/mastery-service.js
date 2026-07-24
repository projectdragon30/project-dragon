import { DomainConditionState, MissionStatus } from "../constants/game-enums.js";
import { calculateDomainTierProgress } from "./domain-progress-service.js";
import { deriveTierXP } from "./xp-service.js";

function check(id, satisfied, current, required, reason) {
  return { id, satisfied, current, required, reason: satisfied ? null : reason };
}

export function evaluateMasteryEligibility(state, domainTierId) {
  const tier = state.domainTiers.find((item) => item.id === domainTierId);
  if (!tier) {
    return { eligible: false, domainTierId, checks: [], blockingReasons: [`Tier inexistente: ${domainTierId}.`] };
  }
  const domain = state.domains.find((item) => item.id === tier.domainId);
  const requirements = tier.masteryRequirements;
  const xp = deriveTierXP(state, tier.id);
  const progress = calculateDomainTierProgress(state, tier.id);
  const completedMissionIds = new Set(state.missionInstances
    .filter((item) => item.status === MissionStatus.COMPLETED)
    .map((item) => item.definitionId));
  const completedMilestoneIds = new Set(state.milestones.filter((item) => item.status === "COMPLETED").map((item) => item.id));
  const defeatedBossIds = new Set(state.bosses.filter((item) => item.status === "DEFEATED").map((item) => item.id));
  const checks = [
    check("requiredXP", xp >= requirements.requiredXP, xp, requirements.requiredXP, "XP de Tier insuficiente."),
    check("minimumProgress", progress >= requirements.minimumProgress, progress, requirements.minimumProgress, "Progreso obligatorio insuficiente."),
    check("requiredMissionIds", requirements.requiredMissionIds.every((id) => completedMissionIds.has(id)),
      [...completedMissionIds], requirements.requiredMissionIds, "Faltan misiones requeridas."),
    check("requiredMilestoneIds", requirements.requiredMilestoneIds.every((id) => completedMilestoneIds.has(id)),
      [...completedMilestoneIds], requirements.requiredMilestoneIds, "Faltan hitos requeridos."),
    check("requiredBossIds", requirements.requiredBossIds.every((id) => defeatedBossIds.has(id)),
      [...defeatedBossIds], requirements.requiredBossIds, "Faltan jefes requeridos."),
    check("blockedConditionStates", !requirements.blockedConditionStates.includes(domain.conditionState),
      domain.conditionState, requirements.blockedConditionStates, `La condición ${domain.conditionState} bloquea maestría.`),
  ];
  return {
    eligible: checks.every((item) => item.satisfied),
    domainTierId,
    checks,
    blockingReasons: checks.filter((item) => !item.satisfied).map((item) => item.reason),
  };
}

export function shouldMasterDomain(state, domainId) {
  const tiers = state.domainTiers.filter((tier) => tier.domainId === domainId);
  return tiers.length > 0 && tiers.every((tier) => tier.status === "MASTERED");
}
