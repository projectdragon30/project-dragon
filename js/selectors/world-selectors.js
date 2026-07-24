import { MissionStatus } from "../constants/game-enums.js";
import {
  calculateMissionProgress,
  calculateObjectiveProgress,
  getMissionCompletionEligibility,
} from "../services/mission-progress-service.js";
import { deriveDomainTotalXP, deriveTierXP } from "../services/xp-service.js";
import {
  calculateDomainTierCompletion,
  calculateDomainTierProgress,
} from "../services/domain-progress-service.js";
import { evaluateMasteryEligibility } from "../services/mastery-service.js";
import { evaluateBossAvailability } from "../services/boss-service.js";
import { evaluateWorldLevelCompletion } from "../services/world-level-service.js";

export const selectWorldLevel = (state, id) => state.worldLevels.find((item) => item.id === id) ?? null;
export const selectDomain = (state, id) => state.domains.find((item) => item.id === id) ?? null;
export const selectDomainTier = (state, id) => state.domainTiers.find((item) => item.id === id) ?? null;
export const selectMissionDefinition = (state, id) => state.missionDefinitions.find((item) => item.id === id) ?? null;
export const selectMissionInstance = (state, id) => state.missionInstances.find((item) => item.id === id) ?? null;
export const selectMissionAvailability = (state, id) => state.system.missionAvailability[id] ?? null;

export function selectObjectiveProgress(state, missionInstanceId, objectiveId) {
  const instance = selectMissionInstance(state, missionInstanceId);
  const definition = instance && selectMissionDefinition(state, instance.definitionId);
  const objective = definition?.objectives.find((item) => item.id === objectiveId);
  return objective ? calculateObjectiveProgress(objective, instance.objectiveProgress[objectiveId], instance.evidenceEntries) : null;
}

export function selectMissionProgress(state, missionInstanceId) {
  const instance = selectMissionInstance(state, missionInstanceId);
  const definition = instance && selectMissionDefinition(state, instance.definitionId);
  return definition ? calculateMissionProgress(definition, instance) : null;
}

export function selectMissionCompletionEligibility(state, missionInstanceId) {
  const instance = selectMissionInstance(state, missionInstanceId);
  const definition = instance && selectMissionDefinition(state, instance.definitionId);
  return definition ? getMissionCompletionEligibility(definition, instance) : null;
}

export const selectDomainTotalXP = (state, id) => selectDomain(state, id) ? deriveDomainTotalXP(state, id) : null;
export const selectTierXP = (state, id) => selectDomainTier(state, id) ? deriveTierXP(state, id) : null;
export const selectDomainTierProgress = (state, id) => selectDomainTier(state, id) ? calculateDomainTierProgress(state, id) : null;
export const selectDomainTierCompletion = (state, id) => selectDomainTier(state, id) ? calculateDomainTierCompletion(state, id) : null;
export const selectAvailableMissions = (state) => state.missionDefinitions.filter((item) => state.system.missionAvailability[item.id] === MissionStatus.AVAILABLE);
export const selectActiveMissions = (state) => state.missionInstances.filter((item) => item.status === MissionStatus.ACTIVE);
export const selectCompletedMissions = (state) => state.missionInstances.filter((item) => item.status === MissionStatus.COMPLETED);
export const selectMasteryEvaluation = (state, id) => selectDomainTier(state, id) ? evaluateMasteryEligibility(state, id) : null;
export const selectMasteryStatus = (state, id) => selectDomainTier(state, id)?.masteryStatus ?? null;
export const selectEligibleDomainTiers = (state) => state.domainTiers.filter((item) => item.masteryStatus === "ELIGIBLE");
export const selectMasteredDomainTiers = (state) => state.domainTiers.filter((item) => item.masteryStatus === "MASTERED");
export const selectMilestone = (state, id) => state.milestones.find((item) => item.id === id) ?? null;
export const selectAvailableMilestones = (state) => state.milestones.filter((item) => item.status === "AVAILABLE");
export const selectCompletedMilestones = (state) => state.milestones.filter((item) => item.status === "COMPLETED");
export const selectBoss = (state, id) => state.bosses.find((item) => item.id === id) ?? null;
export const selectBossAvailability = (state, id) => selectBoss(state, id) ? evaluateBossAvailability(state, id) : null;
export const selectChallengeableBosses = (state) => state.bosses.filter((item) => item.status === "CHALLENGE_AVAILABLE");
export const selectDefeatedBosses = (state) => state.bosses.filter((item) => item.status === "DEFEATED");
export const selectWorldLevelProgress = (state, id) => selectWorldLevel(state, id) ? evaluateWorldLevelCompletion(state, id).progress : null;
export const selectWorldLevelCompletion = (state, id) => selectWorldLevel(state, id) ? evaluateWorldLevelCompletion(state, id) : null;
