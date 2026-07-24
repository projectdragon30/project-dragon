import { DomainConditionState, MissionStatus, MissionType } from "../constants/game-enums.js";
import { selectActiveSignals } from "./condition-service.js";

export function findRestorationMissions(state, domainId) {
  return state.missionDefinitions.filter((mission) =>
    mission.type === MissionType.RESTORATION && mission.primaryDomainId === domainId);
}

export function evaluateRestorationEligibility(state, domainId) {
  const domain = state.domains.find((item) => item.id === domainId);
  const missions = findRestorationMissions(state, domainId);
  const allowed = domain && [DomainConditionState.STRAINED, DomainConditionState.CORRUPTED, DomainConditionState.RECOVERING]
    .includes(domain.conditionState);
  return {
    eligible: Boolean(allowed && missions.length),
    domainId,
    missionDefinitionIds: missions.map((mission) => mission.id),
    blockingReasons: [
      ...(!domain ? ["Dominio inexistente."] : []),
      ...(domain && !allowed ? ["La condición STABLE no admite restauración."] : []),
      ...(missions.length ? [] : ["No existe misión RESTORATION configurada."]),
    ],
  };
}

export function evaluateRestorationCompletion(state, domainId) {
  const missions = findRestorationMissions(state, domainId);
  const completed = missions.filter((definition) =>
    state.missionInstances.some((instance) =>
      instance.definitionId === definition.id && instance.status === MissionStatus.COMPLETED));
  const criticalSignals = selectActiveSignals(state, domainId).filter((signal) => signal.severity === "CRITICAL");
  return {
    satisfied: completed.length > 0 && criticalSignals.length === 0,
    completedMissionIds: completed.map((mission) => mission.id),
    activeCriticalSignalIds: criticalSignals.map((signal) => signal.id),
    blockingReasons: [
      ...(completed.length ? [] : ["Misión de restauración pendiente."]),
      ...(criticalSignals.length ? ["Existen señales CRITICAL activas."] : []),
    ],
  };
}
