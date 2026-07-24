import {
  CommandType,
  DomainConditionState,
  DomainProgressionState,
  DomainTierStatus,
  EventType,
  BossStatus,
  MasteryStatus,
  MilestoneStatus,
  MissionStatus,
  ObjectiveType,
  isEnumValue,
} from "../constants/game-enums.js";
import {
  calculateMissionProgress,
  getMissionCompletionEligibility,
  validateEvidence,
  validateObjectiveValue,
} from "../services/mission-progress-service.js";
import { processMissionRewards } from "../services/reward-service.js";
import { calculateDomainTierProgress } from "../services/domain-progress-service.js";
import { evaluateMasteryEligibility, shouldMasterDomain } from "../services/mastery-service.js";
import { evaluateMilestoneRequirements } from "../services/milestone-service.js";
import { evaluateBossAvailability, evaluateBossDefeat } from "../services/boss-service.js";
import { evaluateWorldLevelCompletion } from "../services/world-level-service.js";
import { validateMasteryRequest, validateMasteryReview } from "../validators/mastery-validator.js";
import { validateMilestoneCompletion } from "../validators/milestone-validator.js";
import { BOSS_TRANSITIONS, validateBossTransition } from "../validators/boss-validator.js";
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

function success(data, eventOrEvents) {
  return { success: true, data, events: Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents] };
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
      [CommandType.UPDATE_OBJECTIVE]: () => this.updateObjective(state, command),
      [CommandType.SUBMIT_EVIDENCE]: () => this.submitEvidence(state, command, timestamp),
      [CommandType.EVALUATE_DOMAIN_MASTERY]: () => this.evaluateDomainMastery(state, command),
      [CommandType.REQUEST_DOMAIN_MASTERY]: () => this.requestDomainMastery(state, command),
      [CommandType.GRANT_DOMAIN_MASTERY]: () => this.grantDomainMastery(state, command, timestamp),
      [CommandType.REJECT_DOMAIN_MASTERY]: () => this.rejectDomainMastery(state, command, timestamp),
      [CommandType.MAKE_MILESTONE_AVAILABLE]: () => this.makeMilestoneAvailable(state, command),
      [CommandType.COMPLETE_MILESTONE]: () => this.completeMilestone(state, command, timestamp),
      [CommandType.REVEAL_BOSS]: () => this.revealBoss(state, command),
      [CommandType.EVALUATE_BOSS_AVAILABILITY]: () => this.evaluateBossAvailability(state, command),
      [CommandType.CHALLENGE_BOSS]: () => this.challengeBoss(state, command),
      [CommandType.DEFEAT_BOSS]: () => this.defeatBoss(state, command),
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
      completedAt: null,
      objectiveProgress: {},
      evidenceEntries: [],
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
    const definition = state.missionDefinitions.find((candidate) => candidate.id === instance.definitionId);
    if (targetStatus === MissionStatus.COMPLETED) {
      const eligibility = getMissionCompletionEligibility(definition, instance);
      if (!eligibility.eligible) {
        return failure("MISSION_REQUIREMENTS_NOT_MET", "La misión conserva requisitos obligatorios pendientes.", {
          missionInstanceId: instance.id,
          pendingObjectiveIds: eligibility.pendingObjectiveIds,
        });
      }
    }
    instance.status = targetStatus;
    instance.closedAt = timestamp;
    if (targetStatus === MissionStatus.COMPLETED) instance.completedAt = timestamp;
    state.system.missionAvailability[instance.definitionId] = targetStatus;
    const events = [{ type: eventType, payload: { missionInstanceId: instance.id, missionDefinitionId: instance.definitionId } }];
    if (targetStatus === MissionStatus.COMPLETED) {
      const rewards = processMissionRewards(state, definition, instance, command, timestamp);
      if (!rewards.success) return failure(rewards.error.code, rewards.error.message);
      events.push(...rewards.events);
      events.push({
        type: EventType.DOMAIN_PROGRESS_UPDATED,
        payload: {
          domainTierId: definition.primaryDomainTierId,
          progress: calculateDomainTierProgress(state, definition.primaryDomainTierId),
        },
      });
    }
    return success({ missionInstanceId: instance.id, status: targetStatus }, events);
  }

  findActiveMissionContext(state, payload) {
    if (!requireText(payload, "missionInstanceId")) {
      return { error: failure("INVALID_PAYLOAD", "payload.missionInstanceId es obligatorio.") };
    }
    const instance = state.missionInstances.find((candidate) => candidate.id === payload.missionInstanceId);
    if (!instance) {
      return { error: failure("MISSION_INSTANCE_NOT_FOUND", `Instancia no encontrada: ${payload.missionInstanceId}.`) };
    }
    if (instance.status !== MissionStatus.ACTIVE) {
      return { error: failure("MISSION_NOT_ACTIVE", "Solo una instancia ACTIVE admite progreso.", { status: instance.status }) };
    }
    const definition = state.missionDefinitions.find((candidate) => candidate.id === instance.definitionId);
    const objective = definition.objectives.find((candidate) => candidate.id === payload.objectiveId);
    if (!objective) {
      return { error: failure("OBJECTIVE_NOT_FOUND", `Objetivo no encontrado: ${String(payload.objectiveId)}.`) };
    }
    return { instance, definition, objective };
  }

  updateObjective(state, command) {
    const context = this.findActiveMissionContext(state, command.payload);
    if (context.error) return context.error;
    if (context.objective.type === ObjectiveType.EVIDENCE || !validateObjectiveValue(context.objective, command.payload.value)) {
      return failure("INVALID_OBJECTIVE_VALUE", "El valor no es compatible con el tipo de objetivo.", {
        objectiveId: context.objective.id,
        objectiveType: context.objective.type,
      });
    }
    const previousProgress = calculateMissionProgress(context.definition, context.instance);
    context.instance.objectiveProgress[context.objective.id] = command.payload.value;
    const progress = calculateMissionProgress(context.definition, context.instance);
    const events = [{
      type: EventType.OBJECTIVE_UPDATED,
      payload: {
        missionInstanceId: context.instance.id,
        objectiveId: context.objective.id,
        value: command.payload.value,
      },
    }];
    if (progress !== previousProgress) {
      events.push({
        type: EventType.MISSION_PROGRESS_UPDATED,
        payload: { missionInstanceId: context.instance.id, progress },
      });
    }
    return success({ missionInstanceId: context.instance.id, objectiveId: context.objective.id, progress }, events);
  }

  submitEvidence(state, command, timestamp) {
    const context = this.findActiveMissionContext(state, command.payload);
    if (context.error) return context.error;
    if (![ObjectiveType.EVIDENCE, ObjectiveType.DECISION].includes(context.objective.type)) {
      return failure("EVIDENCE_REQUIRED", "El objetivo no admite evidencia.", { objectiveId: context.objective.id });
    }
    if (!validateEvidence(context.objective, command.payload.evidence)) {
      return failure("INVALID_EVIDENCE", "La evidencia no satisface la política del objetivo.", {
        objectiveId: context.objective.id,
      });
    }
    const previousProgress = calculateMissionProgress(context.definition, context.instance);
    const entry = {
      id: `evidence-${context.instance.id}-${String(context.instance.evidenceEntries.length + 1).padStart(4, "0")}`,
      missionInstanceId: context.instance.id,
      objectiveId: context.objective.id,
      evidence: {
        level: command.payload.evidence.level,
        kind: command.payload.evidence.kind,
        value: command.payload.evidence.value,
      },
      submittedAt: timestamp,
      commandId: command.id,
    };
    context.instance.evidenceEntries.push(entry);
    if (context.objective.type === ObjectiveType.DECISION) {
      context.instance.objectiveProgress[context.objective.id] = command.payload.evidence.value;
    }
    const progress = calculateMissionProgress(context.definition, context.instance);
    const events = [{
      type: EventType.EVIDENCE_SUBMITTED,
      payload: {
        missionInstanceId: context.instance.id,
        objectiveId: context.objective.id,
        evidenceEntryId: entry.id,
      },
    }];
    if (progress !== previousProgress) {
      events.push({
        type: EventType.MISSION_PROGRESS_UPDATED,
        payload: { missionInstanceId: context.instance.id, progress },
      });
    }
    return success({ missionInstanceId: context.instance.id, objectiveId: context.objective.id, progress }, events);
  }

  findDomainTier(state, payload) {
    if (!requireText(payload, "domainTierId")) return { error: failure("INVALID_PAYLOAD", "payload.domainTierId es obligatorio.") };
    const tier = state.domainTiers.find((item) => item.id === payload.domainTierId);
    return tier ? { tier } : { error: failure("DOMAIN_TIER_NOT_FOUND", `Tier no encontrado: ${payload.domainTierId}.`) };
  }

  evaluateDomainMastery(state, command) {
    const lookup = this.findDomainTier(state, command.payload);
    if (lookup.error) return lookup.error;
    const tier = lookup.tier;
    const evaluation = evaluateMasteryEligibility(state, tier.id);
    if (tier.masteryStatus === MasteryStatus.MASTERED) return success(evaluation, []);
    const previous = tier.masteryStatus;
    if (previous === MasteryStatus.IN_REVIEW && !evaluation.eligible) tier.masteryStatus = MasteryStatus.ELIGIBLE;
    else tier.masteryStatus = evaluation.eligible ? MasteryStatus.ELIGIBLE : MasteryStatus.NOT_ELIGIBLE;
    const events = previous === tier.masteryStatus ? [] : [{
      type: EventType.MASTERY_ELIGIBILITY_CHANGED,
      payload: { domainTierId: tier.id, from: previous, to: tier.masteryStatus, evaluation },
    }];
    return success(evaluation, events);
  }

  requestDomainMastery(state, command) {
    const lookup = this.findDomainTier(state, command.payload);
    if (lookup.error) return lookup.error;
    const validation = validateMasteryRequest(lookup.tier);
    if (!validation.valid) return validationFailure(validation);
    lookup.tier.masteryStatus = MasteryStatus.IN_REVIEW;
    return success(
      { domainTierId: lookup.tier.id, masteryStatus: lookup.tier.masteryStatus },
      { type: EventType.MASTERY_REVIEW_REQUESTED, payload: { domainTierId: lookup.tier.id } },
    );
  }

  grantDomainMastery(state, command, timestamp) {
    const lookup = this.findDomainTier(state, command.payload);
    if (lookup.error) return lookup.error;
    const validation = validateMasteryReview(lookup.tier);
    if (!validation.valid) return validationFailure(validation);
    const evaluation = evaluateMasteryEligibility(state, lookup.tier.id);
    if (!evaluation.eligible) {
      return failure("MASTERY_REQUIREMENTS_NOT_MET", "Los requisitos de maestría ya no se cumplen.", { evaluation });
    }
    lookup.tier.masteryStatus = MasteryStatus.MASTERED;
    lookup.tier.status = DomainTierStatus.MASTERED;
    lookup.tier.masteredAt = timestamp;
    const domain = state.domains.find((item) => item.id === lookup.tier.domainId);
    const events = [
      { type: EventType.MASTERY_GRANTED, payload: { domainTierId: lookup.tier.id } },
      { type: EventType.DOMAIN_TIER_MASTERED, payload: { domainTierId: lookup.tier.id, domainId: domain.id } },
    ];
    if (shouldMasterDomain(state, domain.id)) {
      domain.masteryStatus = MasteryStatus.MASTERED;
      domain.progressionState = DomainProgressionState.MASTERED;
      domain.masteredAt = timestamp;
      events.push({ type: EventType.DOMAIN_MASTERED, payload: { domainId: domain.id } });
    }
    return success({ domainTierId: lookup.tier.id, masteryStatus: lookup.tier.masteryStatus }, events);
  }

  rejectDomainMastery(state, command, timestamp) {
    const lookup = this.findDomainTier(state, command.payload);
    if (lookup.error) return lookup.error;
    const validation = validateMasteryReview(lookup.tier);
    if (!validation.valid) return validationFailure(validation);
    if (!requireText(command.payload, "reason")) {
      return failure("MASTERY_REJECTION_REASON_REQUIRED", "payload.reason debe ser un texto no vacío.");
    }
    lookup.tier.masteryStatus = MasteryStatus.ELIGIBLE;
    lookup.tier.lastMasteryReview = { status: "REJECTED", reason: command.payload.reason.trim(), reviewedAt: timestamp, commandId: command.id };
    return success(
      { domainTierId: lookup.tier.id, masteryStatus: lookup.tier.masteryStatus },
      { type: EventType.MASTERY_REVIEW_REJECTED, payload: { domainTierId: lookup.tier.id, reason: command.payload.reason.trim() } },
    );
  }

  findMilestone(state, payload) {
    if (!requireText(payload, "milestoneId")) return { error: failure("INVALID_PAYLOAD", "payload.milestoneId es obligatorio.") };
    const milestone = state.milestones.find((item) => item.id === payload.milestoneId);
    return milestone ? { milestone } : { error: failure("MILESTONE_NOT_FOUND", `Hito no encontrado: ${payload.milestoneId}.`) };
  }

  makeMilestoneAvailable(state, command) {
    const lookup = this.findMilestone(state, command.payload);
    if (lookup.error) return lookup.error;
    if (lookup.milestone.status !== MilestoneStatus.LOCKED) {
      return failure("INVALID_TRANSITION", "Solo un hito LOCKED puede pasar a AVAILABLE.");
    }
    lookup.milestone.status = MilestoneStatus.AVAILABLE;
    return success({ milestoneId: lookup.milestone.id, status: lookup.milestone.status },
      { type: EventType.MILESTONE_AVAILABLE, payload: { milestoneId: lookup.milestone.id } });
  }

  completeMilestone(state, command, timestamp) {
    const lookup = this.findMilestone(state, command.payload);
    if (lookup.error) return lookup.error;
    const transition = validateMilestoneCompletion(lookup.milestone);
    if (!transition.valid) return validationFailure(transition);
    const evaluation = evaluateMilestoneRequirements(state, lookup.milestone);
    if (!evaluation.satisfied) return failure("MILESTONE_REQUIREMENTS_NOT_MET", "El hito conserva requisitos pendientes.", { evaluation });
    const evidence = command.payload.evidence;
    if (evidence !== undefined) {
      if (!evidence || evidence.kind !== "TEXT" || typeof evidence.value !== "string" || !evidence.value.trim()) {
        return failure("INVALID_EVIDENCE", "La evidencia del hito debe ser texto no vacío.");
      }
      lookup.milestone.evidenceEntries.push({
        id: `evidence-${lookup.milestone.id}-${String(lookup.milestone.evidenceEntries.length + 1).padStart(4, "0")}`,
        kind: "TEXT", value: evidence.value, submittedAt: timestamp, commandId: command.id,
      });
    }
    lookup.milestone.status = MilestoneStatus.COMPLETED;
    lookup.milestone.completedAt = timestamp;
    const progress = calculateDomainTierProgress(state, lookup.milestone.domainTierId);
    return success({ milestoneId: lookup.milestone.id, status: lookup.milestone.status }, [
      { type: EventType.MILESTONE_COMPLETED, payload: { milestoneId: lookup.milestone.id } },
      { type: EventType.DOMAIN_PROGRESS_UPDATED, payload: { domainTierId: lookup.milestone.domainTierId, progress } },
    ]);
  }

  findBoss(state, payload) {
    if (!requireText(payload, "bossId")) return { error: failure("INVALID_PAYLOAD", "payload.bossId es obligatorio.") };
    const boss = state.bosses.find((item) => item.id === payload.bossId);
    return boss ? { boss } : { error: failure("BOSS_NOT_FOUND", `Jefe no encontrado: ${payload.bossId}.`) };
  }

  revealBoss(state, command) {
    const lookup = this.findBoss(state, command.payload);
    if (lookup.error) return lookup.error;
    const validation = validateBossTransition(lookup.boss, BOSS_TRANSITIONS.reveal, "INVALID_TRANSITION");
    if (!validation.valid) return validationFailure(validation);
    lookup.boss.status = BossStatus.REVEALED;
    return success({ bossId: lookup.boss.id, status: lookup.boss.status },
      { type: EventType.BOSS_REVEALED, payload: { bossId: lookup.boss.id } });
  }

  evaluateBossAvailability(state, command) {
    const lookup = this.findBoss(state, command.payload);
    if (lookup.error) return lookup.error;
    if (lookup.boss.status === BossStatus.HIDDEN) return failure("BOSS_NOT_REVEALED", "El jefe todavía está HIDDEN.");
    const evaluation = evaluateBossAvailability(state, lookup.boss.id);
    const events = [];
    if (lookup.boss.status === BossStatus.REVEALED && evaluation.available) {
      lookup.boss.status = BossStatus.CHALLENGE_AVAILABLE;
      events.push({ type: EventType.BOSS_CHALLENGE_AVAILABLE, payload: { bossId: lookup.boss.id, evaluation } });
    }
    return success(evaluation, events);
  }

  challengeBoss(state, command) {
    const lookup = this.findBoss(state, command.payload);
    if (lookup.error) return lookup.error;
    const validation = validateBossTransition(lookup.boss, BOSS_TRANSITIONS.challenge, "BOSS_NOT_AVAILABLE");
    if (!validation.valid) return validationFailure(validation);
    lookup.boss.status = BossStatus.CHALLENGED;
    lookup.boss.challengeMissionIds.forEach((id) => {
      if (state.system.missionAvailability[id] !== MissionStatus.COMPLETED) {
        state.system.missionAvailability[id] = MissionStatus.AVAILABLE;
      }
    });
    return success({ bossId: lookup.boss.id, status: lookup.boss.status, challengeMissionIds: lookup.boss.challengeMissionIds },
      { type: EventType.BOSS_CHALLENGED, payload: { bossId: lookup.boss.id, challengeMissionIds: lookup.boss.challengeMissionIds } });
  }

  defeatBoss(state, command) {
    const lookup = this.findBoss(state, command.payload);
    if (lookup.error) return lookup.error;
    const validation = validateBossTransition(lookup.boss, BOSS_TRANSITIONS.defeat, "BOSS_NOT_CHALLENGED");
    if (!validation.valid) return validationFailure(validation);
    const evaluation = evaluateBossDefeat(state, lookup.boss.id);
    if (!evaluation.available) return failure("BOSS_REQUIREMENTS_NOT_MET", "El desafío conserva requisitos pendientes.", { evaluation });
    lookup.boss.status = BossStatus.DEFEATED;
    const tierId = lookup.boss.requirementGroups.flatMap((group) => group.requirements)
      .find((requirement) => requirement.domainTierId)?.domainTierId ?? null;
    const levelEvaluation = evaluateWorldLevelCompletion(state, lookup.boss.worldLevelId);
    const events = [{ type: EventType.BOSS_DEFEATED, payload: { bossId: lookup.boss.id } }];
    if (tierId) events.push({ type: EventType.DOMAIN_PROGRESS_UPDATED, payload: { domainTierId: tierId, progress: calculateDomainTierProgress(state, tierId) } });
    events.push({ type: EventType.WORLD_LEVEL_PROGRESS_UPDATED, payload: { worldLevelId: lookup.boss.worldLevelId, ...levelEvaluation } });
    if (levelEvaluation.completed) events.push({ type: EventType.WORLD_LEVEL_COMPLETED, payload: { worldLevelId: lookup.boss.worldLevelId } });
    return success({ bossId: lookup.boss.id, status: lookup.boss.status }, events);
  }
}
