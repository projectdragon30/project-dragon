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
