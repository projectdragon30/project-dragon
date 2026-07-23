import {
  CommandType,
  DomainConditionState,
  DomainProgressionState,
  EventType,
  MissionStatus,
  isEnumValue,
} from "../constants/game-enums.js";
import {
  validateDomainActivationTransition,
  validateDomainAvailabilityTransition,
  validateDomainConditionTransition,
  validateDomainRecoveryStart,
} from "../validators/domain-transition-validator.js";
import {
  validateMissionAvailability,
  validateMissionClosure,
  validateMissionReveal,
  validateMissionStart,
} from "../validators/mission-transition-validator.js";

function success(data, event) {
  return { success: true, data, event };
}

function failure(code, message, details = {}) {
  return { success: false, data: null, event: null, errors: [{ code, message, details }] };
}

function validationFailure(result) {
  return { success: false, data: null, event: null, errors: result.errors };
}

function requireText(payload, key) {
  return typeof payload?.[key] === "string" && payload[key].trim().length > 0;
}

export class CommandHandler {
  handle(state, command, timestamp) {
    const handlers = {
      [CommandType.MAKE_DOMAIN_AVAILABLE]: () => this.makeDomainAvailable(state, command),
      [CommandType.ACTIVATE_DOMAIN]: () => this.activateDomain(state, command),
      [CommandType.SET_DOMAIN_CONDITION]: () => this.setDomainCondition(state, command),
      [CommandType.START_DOMAIN_RECOVERY]: () => this.startDomainRecovery(state, command),
      [CommandType.REVEAL_MISSION]: () => this.revealMission(state, command),
      [CommandType.MAKE_MISSION_AVAILABLE]: () => this.makeMissionAvailable(state, command),
      [CommandType.START_MISSION]: () => this.startMission(state, command, timestamp),
      [CommandType.COMPLETE_MISSION]: () => this.closeMission(state, command, MissionStatus.COMPLETED, EventType.MISSION_COMPLETED, timestamp),
      [CommandType.FAIL_MISSION]: () => this.closeMission(state, command, MissionStatus.FAILED, EventType.MISSION_FAILED, timestamp),
      [CommandType.ABANDON_MISSION]: () => this.closeMission(state, command, MissionStatus.ABANDONED, EventType.MISSION_ABANDONED, timestamp),
      [CommandType.EXPIRE_MISSION]: () => this.closeMission(state, command, MissionStatus.EXPIRED, EventType.MISSION_EXPIRED, timestamp),
    };

    if (!isEnumValue(CommandType, command.type) || !handlers[command.type]) {
      return failure("INVALID_COMMAND", `Comando no soportado: ${String(command.type)}.`, { type: command.type });
    }
    return handlers[command.type]();
  }

  findDomain(state, payload) {
    if (!requireText(payload, "domainId")) {
      return { error: failure("INVALID_PAYLOAD", "payload.domainId es obligatorio.") };
    }
    const domain = state.domains.find((candidate) => candidate.id === payload.domainId);
    if (!domain) {
      return { error: failure("DOMAIN_NOT_FOUND", `Dominio no encontrado: ${payload.domainId}.`, { domainId: payload.domainId }) };
    }
    return { domain };
  }

  makeDomainAvailable(state, command) {
    const lookup = this.findDomain(state, command.payload);
    if (lookup.error) return lookup.error;
    const validation = validateDomainAvailabilityTransition(lookup.domain);
    if (!validation.valid) return validationFailure(validation);
    lookup.domain.progressionState = DomainProgressionState.AVAILABLE;
    return success(
      { domainId: lookup.domain.id, progressionState: lookup.domain.progressionState },
      { type: EventType.DOMAIN_AVAILABLE, payload: { domainId: lookup.domain.id } },
    );
  }

  activateDomain(state, command) {
    const lookup = this.findDomain(state, command.payload);
    if (lookup.error) return lookup.error;
    const validation = validateDomainActivationTransition(lookup.domain);
    if (!validation.valid) return validationFailure(validation);
    lookup.domain.progressionState = DomainProgressionState.ACTIVE;
    return success(
      { domainId: lookup.domain.id, progressionState: lookup.domain.progressionState },
      { type: EventType.DOMAIN_ACTIVATED, payload: { domainId: lookup.domain.id } },
    );
  }

  setDomainCondition(state, command) {
    const lookup = this.findDomain(state, command.payload);
    if (lookup.error) return lookup.error;
    const target = command.payload?.conditionState;
    if (!isEnumValue(DomainConditionState, target)) {
      return failure("INVALID_PAYLOAD", "payload.conditionState debe ser un estado oficial.", { conditionState: target });
    }
    const previous = lookup.domain.conditionState;
    const validation = validateDomainConditionTransition(lookup.domain, target, command.payload);
    if (!validation.valid) return validationFailure(validation);
    lookup.domain.conditionState = target;
    const eventType =
      target === DomainConditionState.STRAINED
        ? EventType.DOMAIN_STRAINED
        : target === DomainConditionState.STABLE
          ? EventType.DOMAIN_RESTORED
          : previous === DomainConditionState.RECOVERING
            ? EventType.DOMAIN_RECOVERY_INTERRUPTED
            : EventType.DOMAIN_CORRUPTED;
    return success(
      { domainId: lookup.domain.id, conditionState: target },
      { type: eventType, payload: { domainId: lookup.domain.id, from: previous, to: target, cause: command.payload.cause ?? null } },
    );
  }

  startDomainRecovery(state, command) {
    const lookup = this.findDomain(state, command.payload);
    if (lookup.error) return lookup.error;
    const validation = validateDomainRecoveryStart(lookup.domain);
    if (!validation.valid) return validationFailure(validation);
    lookup.domain.conditionState = DomainConditionState.RECOVERING;
    return success(
      { domainId: lookup.domain.id, conditionState: DomainConditionState.RECOVERING },
      { type: EventType.DOMAIN_RECOVERY_STARTED, payload: { domainId: lookup.domain.id } },
    );
  }

  findMissionDefinition(state, payload) {
    if (!requireText(payload, "missionDefinitionId")) {
      return { error: failure("INVALID_PAYLOAD", "payload.missionDefinitionId es obligatorio.") };
    }
    const definition = state.missionDefinitions.find((candidate) => candidate.id === payload.missionDefinitionId);
    if (!definition) {
      return {
        error: failure("MISSION_NOT_FOUND", `Misión no encontrada: ${payload.missionDefinitionId}.`, {
          missionDefinitionId: payload.missionDefinitionId,
        }),
      };
    }
    return { definition };
  }

  revealMission(state, command) {
    const lookup = this.findMissionDefinition(state, command.payload);
    if (lookup.error) return lookup.error;
    const current = state.system.missionAvailability[lookup.definition.id];
    const validation = validateMissionReveal(current, lookup.definition.id);
    if (!validation.valid) return validationFailure(validation);
    state.system.missionAvailability[lookup.definition.id] = MissionStatus.LOCKED;
    return success(
      { missionDefinitionId: lookup.definition.id, status: MissionStatus.LOCKED },
      { type: EventType.MISSION_REVEALED, payload: { missionDefinitionId: lookup.definition.id } },
    );
  }

  makeMissionAvailable(state, command) {
    const lookup = this.findMissionDefinition(state, command.payload);
    if (lookup.error) return lookup.error;
    const current = state.system.missionAvailability[lookup.definition.id];
    const validation = validateMissionAvailability(current, lookup.definition.id);
    if (!validation.valid) return validationFailure(validation);
    state.system.missionAvailability[lookup.definition.id] = MissionStatus.AVAILABLE;
    return success(
      { missionDefinitionId: lookup.definition.id, status: MissionStatus.AVAILABLE },
      { type: EventType.MISSION_AVAILABLE, payload: { missionDefinitionId: lookup.definition.id } },
    );
  }

  startMission(state, command, timestamp) {
    const lookup = this.findMissionDefinition(state, command.payload);
    if (lookup.error) return lookup.error;
    const current = state.system.missionAvailability[lookup.definition.id];
    const validation = validateMissionStart(current, lookup.definition.id);
    if (!validation.valid) return validationFailure(validation);
    const attemptNumber =
      state.missionInstances.filter((instance) => instance.definitionId === lookup.definition.id).length + 1;
    const instance = {
      id: `${lookup.definition.id}-instance-${attemptNumber}`,
      definitionId: lookup.definition.id,
      status: MissionStatus.ACTIVE,
      attemptNumber,
      startedAt: timestamp,
      closedAt: null,
    };
    state.missionInstances.push(instance);
    state.system.missionAvailability[lookup.definition.id] = MissionStatus.ACTIVE;
    return success(
      { missionInstanceId: instance.id, definitionId: instance.definitionId, status: instance.status, attemptNumber },
      { type: EventType.MISSION_STARTED, payload: { missionInstanceId: instance.id, missionDefinitionId: instance.definitionId, attemptNumber } },
    );
  }

  closeMission(state, command, targetStatus, eventType, timestamp) {
    if (!requireText(command.payload, "missionInstanceId")) {
      return failure("INVALID_PAYLOAD", "payload.missionInstanceId es obligatorio.");
    }
    const instance = state.missionInstances.find((candidate) => candidate.id === command.payload.missionInstanceId);
    if (!instance) {
      return failure("MISSION_INSTANCE_NOT_FOUND", `Instancia no encontrada: ${command.payload.missionInstanceId}.`, {
        missionInstanceId: command.payload.missionInstanceId,
      });
    }
    const validation = validateMissionClosure(instance, targetStatus);
    if (!validation.valid) return validationFailure(validation);
    instance.status = targetStatus;
    instance.closedAt = timestamp;
    state.system.missionAvailability[instance.definitionId] = targetStatus;
    return success(
      { missionInstanceId: instance.id, status: targetStatus },
      { type: eventType, payload: { missionInstanceId: instance.id, missionDefinitionId: instance.definitionId } },
    );
  }
}
