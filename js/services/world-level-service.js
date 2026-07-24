import { MissionStatus } from "../constants/game-enums.js";

export function evaluateWorldLevelCompletion(state, worldLevelId) {
  const level = state.worldLevels.find((item) => item.id === worldLevelId);
  if (!level) return { completed: false, progress: 0, checks: [], blockingReasons: [`Nivel inexistente: ${worldLevelId}.`] };
  const requirements = level.requirements;
  const checks = [
    ...requirements.requiredBossIds.map((id) => ({ id: `boss:${id}`, satisfied: state.bosses.some((item) => item.id === id && item.status === "DEFEATED") })),
    ...requirements.requiredDomainTierIds.map((id) => ({ id: `tier:${id}`, satisfied: state.domainTiers.some((item) => item.id === id && item.status === "MASTERED") })),
    ...requirements.requiredMissionIds.map((id) => ({ id: `mission:${id}`, satisfied: state.missionInstances.some((item) => item.definitionId === id && item.status === MissionStatus.COMPLETED) })),
    ...requirements.requiredMilestoneIds.map((id) => ({ id: `milestone:${id}`, satisfied: state.milestones.some((item) => item.id === id && item.status === "COMPLETED") })),
  ];
  const progress = checks.length === 0 ? 0 : checks.filter((check) => check.satisfied).length / checks.length;
  const contractSatisfied = checks.every((check) => check.satisfied);
  return {
    completed: level.completionEnabled === true && contractSatisfied,
    progress,
    checks,
    blockingReasons: [
      ...checks.filter((check) => !check.satisfied).map((check) => `Requisito pendiente: ${check.id}.`),
      ...(level.completionEnabled ? [] : ["Cierre deshabilitado mientras el contenido sea DEMO."]),
    ],
  };
}
