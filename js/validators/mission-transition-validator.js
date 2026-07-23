import { MissionStatus } from "../constants/game-enums.js";

const CLOSED_STATUSES = new Set([
  MissionStatus.COMPLETED,
  MissionStatus.FAILED,
  MissionStatus.ABANDONED,
  MissionStatus.EXPIRED,
]);

function accepted() {
  return { valid: true, errors: [] };
}

function rejected(code, message, details) {
  return { valid: false, errors: [{ code, message, details }] };
}

export function validateMissionReveal(status, definitionId) {
  if (status !== MissionStatus.HIDDEN) {
    return rejected("INVALID_TRANSITION", "Solo una misión HIDDEN puede revelarse.", {
      definitionId,
      from: status,
      to: MissionStatus.LOCKED,
    });
  }
  return accepted();
}

export function validateMissionAvailability(status, definitionId) {
  if (![MissionStatus.HIDDEN, MissionStatus.LOCKED].includes(status)) {
    return rejected("INVALID_TRANSITION", "La misión no puede pasar a AVAILABLE desde su estado actual.", {
      definitionId,
      from: status,
      to: MissionStatus.AVAILABLE,
    });
  }
  return accepted();
}

export function validateMissionStart(status, definitionId) {
  if (status !== MissionStatus.AVAILABLE) {
    return rejected("MISSION_NOT_AVAILABLE", "La misión debe estar AVAILABLE antes de iniciarse.", {
      definitionId,
      status,
    });
  }
  return accepted();
}

export function validateMissionClosure(instance, targetStatus) {
  if (CLOSED_STATUSES.has(instance.status)) {
    return rejected("MISSION_ALREADY_CLOSED", "Una instancia cerrada no puede volver a cambiar.", {
      missionInstanceId: instance.id,
      status: instance.status,
    });
  }
  if (instance.status !== MissionStatus.ACTIVE) {
    return rejected("MISSION_NOT_ACTIVE", "Solo una instancia ACTIVE puede cerrarse.", {
      missionInstanceId: instance.id,
      status: instance.status,
    });
  }
  if (!CLOSED_STATUSES.has(targetStatus)) {
    return rejected("INVALID_TRANSITION", "El estado final solicitado no es válido.", {
      missionInstanceId: instance.id,
      targetStatus,
    });
  }
  return accepted();
}

export function isClosedMissionStatus(status) {
  return CLOSED_STATUSES.has(status);
}
