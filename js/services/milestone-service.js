import { MissionStatus } from "../constants/game-enums.js";

export function evaluateMilestoneRequirements(state, milestone) {
  const checks = (milestone.requirements ?? []).map((requirement) => {
    if (requirement.type === "MISSION_COMPLETED") {
      const satisfied = state.missionInstances.some(
        (instance) => instance.definitionId === requirement.missionDefinitionId &&
          instance.status === MissionStatus.COMPLETED,
      );
      return { type: requirement.type, satisfied, referenceId: requirement.missionDefinitionId };
    }
    return { type: requirement.type, satisfied: false, referenceId: null };
  });
  return {
    satisfied: checks.every((check) => check.satisfied),
    checks,
    blockingReasons: checks.filter((check) => !check.satisfied).map((check) => `Requisito pendiente: ${check.type}.`),
  };
}
