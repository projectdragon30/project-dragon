import {
  BossScope,
  BossStatus,
  AffinityStrength,
  ConditionSignalSeverity,
  ConditionSignalType,
  DomainConditionState,
  DomainProgressionState,
  DomainTierStatus,
  EvidenceLevel,
  EventType,
  MasteryStatus,
  MissionCriticality,
  MissionDifficulty,
  MissionPriority,
  MissionScope,
  MissionStatus,
  MissionType,
  MilestoneStatus,
  ObjectiveType,
  RetryPolicy,
  isEnumValue,
} from "../constants/game-enums.js";
import { validateEvidence, validateObjectiveValue } from "../services/mission-progress-service.js";
import { deriveDomainTotalXP, deriveTierXP } from "../services/xp-service.js";

const REQUIRED_ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "metadata",
  "player",
  "currentWorldLevelId",
  "worldLevels",
  "domains",
  "domainTiers",
  "affinities",
  "contributions",
  "missionDefinitions",
  "missionInstances",
  "milestones",
  "bosses",
  "xpTransactions",
  "rewardTransactions",
  "eventLog",
  "system",
]);

const ARRAY_ROOT_KEYS = Object.freeze([
  "worldLevels",
  "domains",
  "domainTiers",
  "affinities",
  "contributions",
  "missionDefinitions",
  "missionInstances",
  "milestones",
  "bosses",
  "xpTransactions",
  "rewardTransactions",
  "eventLog",
]);

export class WorldStateValidationError extends Error {
  constructor(errors) {
    super(`World State inválido: ${errors.length} error(es) estructural(es).`);
    this.name = "WorldStateValidationError";
    this.code = "WORLD_STATE_INVALID";
    this.errors = errors;
  }
}

function addError(errors, code, path, message, value) {
  const error = { code, path, message };
  if (value !== undefined) error.value = value;
  errors.push(error);
}

function validateEnum(errors, enumCatalog, value, path) {
  if (!isEnumValue(enumCatalog, value)) {
    addError(errors, "INVALID_ENUM", path, `Valor de enum no permitido en ${path}.`, value);
  }
}

function validateUniqueIds(errors, items, path) {
  const ids = new Set();

  items.forEach((item, index) => {
    if (!item || typeof item.id !== "string" || item.id.length === 0) {
      addError(errors, "INVALID_ID", `${path}[${index}].id`, "El identificador debe ser un texto no vacío.");
      return;
    }

    if (ids.has(item.id)) {
      addError(errors, "DUPLICATE_ID", `${path}[${index}].id`, `Identificador repetido: ${item.id}.`, item.id);
    }
    ids.add(item.id);
  });

  return ids;
}

function validateGlobalEntityIds(errors, collections) {
  const locations = new Map();

  collections.forEach(([path, items]) => {
    items.forEach((item, index) => {
      if (!item || typeof item.id !== "string" || item.id.length === 0) return;
      const itemPath = `${path}[${index}].id`;
      if (locations.has(item.id)) {
        addError(
          errors,
          "DUPLICATE_GLOBAL_ID",
          itemPath,
          `El identificador ${item.id} ya fue utilizado en ${locations.get(item.id)}.`,
          item.id,
        );
      } else {
        locations.set(item.id, itemPath);
      }
    });
  });
}

function validateSerializableValue(errors, value, path, ancestors) {
  if (value === undefined || typeof value === "symbol" || typeof value === "bigint") {
    addError(errors, "NON_SERIALIZABLE_VALUE", path, `Tipo no serializable: ${typeof value}.`);
    return;
  }

  if (typeof value === "function") {
    addError(errors, "NON_SERIALIZABLE_FUNCTION", path, "World State no puede contener funciones.");
    return;
  }

  if (value instanceof Date) {
    addError(errors, "NON_SERIALIZABLE_DATE", path, "Las fechas deben almacenarse como texto ISO 8601.");
    return;
  }

  if (value === null || typeof value !== "object") return;

  if (typeof Node !== "undefined" && value instanceof Node) {
    addError(errors, "NON_SERIALIZABLE_DOM_NODE", path, "World State no puede contener nodos DOM.");
    return;
  }

  if (ancestors.has(value)) {
    addError(errors, "CIRCULAR_REFERENCE", path, "World State no puede contener referencias circulares.");
    return;
  }

  ancestors.add(value);
  Object.entries(value).forEach(([key, child]) => {
    validateSerializableValue(errors, child, `${path}.${key}`, ancestors);
  });
  ancestors.delete(value);
}

function validateIsoDate(errors, value, path) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    addError(errors, "INVALID_ISO_DATE", path, "La fecha debe ser un texto ISO 8601 válido.", value);
  }
}

export function validateWorldState(state) {
  const errors = [];

  if (!state || typeof state !== "object" || Array.isArray(state)) {
    addError(errors, "INVALID_ROOT", "$", "World State debe ser un objeto.");
    return { valid: false, errors };
  }

  validateSerializableValue(errors, state, "$", new WeakSet());

  REQUIRED_ROOT_KEYS.forEach((key) => {
    if (!Object.hasOwn(state, key)) {
      addError(errors, "MISSING_ROOT_KEY", `$.${key}`, `Falta la propiedad raíz ${key}.`);
    }
  });

  ARRAY_ROOT_KEYS.forEach((key) => {
    if (Object.hasOwn(state, key) && !Array.isArray(state[key])) {
      addError(errors, "INVALID_ROOT_COLLECTION", `$.${key}`, `${key} debe ser un arreglo.`);
    }
  });

  if (errors.some((error) => error.code === "MISSING_ROOT_KEY" || error.code === "INVALID_ROOT_COLLECTION")) {
    return { valid: false, errors };
  }

  validateIsoDate(errors, state.metadata?.createdAt, "$.metadata.createdAt");
  validateIsoDate(errors, state.metadata?.updatedAt, "$.metadata.updatedAt");

  const worldLevelIds = validateUniqueIds(errors, state.worldLevels, "$.worldLevels");
  const domainIds = validateUniqueIds(errors, state.domains, "$.domains");
  const tierIds = validateUniqueIds(errors, state.domainTiers, "$.domainTiers");
  const bossIds = validateUniqueIds(errors, state.bosses, "$.bosses");
  const missionDefinitionIds = validateUniqueIds(errors, state.missionDefinitions, "$.missionDefinitions");
  validateUniqueIds(errors, state.missionInstances, "$.missionInstances");
  const milestoneIds = validateUniqueIds(errors, state.milestones, "$.milestones");
  validateGlobalEntityIds(errors, [
    ["$.worldLevels", state.worldLevels],
    ["$.domains", state.domains],
    ["$.domainTiers", state.domainTiers],
    ["$.affinities", state.affinities],
    ["$.contributions", state.contributions],
    ["$.missionDefinitions", state.missionDefinitions],
    ["$.missionInstances", state.missionInstances],
    ["$.milestones", state.milestones],
    ["$.bosses", state.bosses],
    ["$.xpTransactions", state.xpTransactions],
    ["$.rewardTransactions", state.rewardTransactions],
    ["$.eventLog", state.eventLog],
  ]);

  if (!worldLevelIds.has(state.currentWorldLevelId)) {
    addError(
      errors,
      "INVALID_REFERENCE",
      "$.currentWorldLevelId",
      `El nivel actual ${state.currentWorldLevelId} no existe.`,
      state.currentWorldLevelId,
    );
  }

  state.domains.forEach((domain, index) => {
    const path = `$.domains[${index}]`;
    validateEnum(errors, DomainProgressionState, domain.progressionState, `${path}.progressionState`);
    validateEnum(errors, DomainConditionState, domain.conditionState, `${path}.conditionState`);
    validateEnum(errors, MasteryStatus, domain.masteryStatus, `${path}.masteryStatus`);
    if (!Number.isFinite(domain.totalXP) || domain.totalXP < 0) {
      addError(errors, "INVALID_XP_CACHE", `${path}.totalXP`, "totalXP debe ser un número no negativo.");
    } else if (domain.totalXP !== deriveDomainTotalXP(state, domain.id)) {
      addError(errors, "INVALID_XP_CACHE", `${path}.totalXP`, "totalXP no coincide con xpTransactions.");
    }

    if (domain.id === "legado" && domain.progressionState !== DomainProgressionState.CONSEQUENCE) {
      addError(errors, "INVALID_LEGACY_STATE", `${path}.progressionState`, "Legado debe usar CONSEQUENCE.");
    }
  });

  state.domainTiers.forEach((tier, index) => {
    const path = `$.domainTiers[${index}]`;
    if (!domainIds.has(tier.domainId)) {
      addError(
        errors,
        "INVALID_REFERENCE",
        `$.domainTiers[${index}].domainId`,
        `El Dominio ${tier.domainId} no existe.`,
        tier.domainId,
      );
    }
    validateEnum(errors, DomainTierStatus, tier.status, `${path}.status`);
    validateEnum(errors, MasteryStatus, tier.masteryStatus, `${path}.masteryStatus`);
    if ((tier.status === DomainTierStatus.MASTERED) !== (tier.masteryStatus === MasteryStatus.MASTERED)) {
      addError(errors, "INVALID_MASTERY_STATE", path, "Tier status y masteryStatus MASTERED deben ser consistentes.");
    }
    if (tier.masteredAt) validateIsoDate(errors, tier.masteredAt, `${path}.masteredAt`);
    const mastery = tier.masteryRequirements;
    if (!mastery || !Number.isFinite(mastery.requiredXP) || mastery.requiredXP < 0 ||
        !Number.isFinite(mastery.minimumProgress) || mastery.minimumProgress < 0 || mastery.minimumProgress > 1) {
      addError(errors, "INVALID_MASTERY_REQUIREMENTS", `${path}.masteryRequirements`, "Requisitos de maestría inválidos.");
    } else {
      mastery.requiredMissionIds.forEach((id) => {
        if (!missionDefinitionIds.has(id)) addError(errors, "INVALID_REFERENCE", `${path}.masteryRequirements.requiredMissionIds`, `Misión inexistente: ${id}.`);
      });
      mastery.requiredMilestoneIds.forEach((id) => {
        if (!milestoneIds.has(id)) addError(errors, "INVALID_REFERENCE", `${path}.masteryRequirements.requiredMilestoneIds`, `Hito inexistente: ${id}.`);
      });
      mastery.requiredBossIds.forEach((id) => {
        if (!bossIds.has(id)) addError(errors, "INVALID_REFERENCE", `${path}.masteryRequirements.requiredBossIds`, `Jefe inexistente: ${id}.`);
      });
      mastery.blockedConditionStates.forEach((status, statusIndex) =>
        validateEnum(errors, DomainConditionState, status, `${path}.masteryRequirements.blockedConditionStates[${statusIndex}]`));
    }
    if (!Number.isFinite(tier.tierXP) || tier.tierXP < 0 || tier.tierXP !== deriveTierXP(state, tier.id)) {
      addError(errors, "INVALID_XP_CACHE", `${path}.tierXP`, "tierXP no coincide con xpTransactions.");
    }
    const config = tier.progressConfig;
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      addError(errors, "INVALID_PROGRESS_CONFIG", `${path}.progressConfig`, "progressConfig debe ser un objeto.");
    } else {
      const weights = Object.values(config);
      if (weights.some((weight) => !Number.isFinite(weight) || weight < 0) ||
          weights.reduce((sum, weight) => sum + weight, 0) !== 100) {
        addError(errors, "INVALID_PROGRESS_CONFIG", `${path}.progressConfig`, "Los pesos de progressConfig deben sumar 100.");
      }
    }
  });

  state.affinities.forEach((affinity, index) => {
    const path = `$.affinities[${index}]`;
    if (!domainIds.has(affinity.sourceDomainId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.sourceDomainId`, `El Dominio ${affinity.sourceDomainId} no existe.`);
    }
    if (!domainIds.has(affinity.targetDomainId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.targetDomainId`, `El Dominio ${affinity.targetDomainId} no existe.`);
    }
    if (affinity.sourceDomainId === affinity.targetDomainId) {
      addError(errors, "SELF_AFFINITY", path, "Una afinidad no puede usar el mismo Dominio como origen y destino.");
    }
    validateEnum(errors, AffinityStrength, affinity.strength, `${path}.strength`);
    if (typeof affinity.active !== "boolean" || !affinity.effects || typeof affinity.effects !== "object") {
      addError(errors, "INVALID_AFFINITY", path, "Afinidad incompleta.");
    }
  });
  const activeDirections = new Set();
  state.affinities.filter((affinity) => affinity.active).forEach((affinity, index) => {
    const key = `${affinity.sourceDomainId}->${affinity.targetDomainId}`;
    if (activeDirections.has(key)) addError(errors, "DUPLICATE_ACTIVE_AFFINITY", `$.affinities[${index}]`, "Afinidad activa duplicada.");
    activeDirections.add(key);
  });

  state.bosses.forEach((boss, index) => {
    const path = `$.bosses[${index}]`;
    validateEnum(errors, BossScope, boss.scope, `${path}.scope`);
    validateEnum(errors, BossStatus, boss.status, `${path}.status`);
    if (boss.worldLevelId && !worldLevelIds.has(boss.worldLevelId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.worldLevelId`, `El nivel ${boss.worldLevelId} no existe.`);
    }
    if (boss.domainId && !domainIds.has(boss.domainId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.domainId`, `El Dominio ${boss.domainId} no existe.`);
    }
    (boss.challengeMissionIds ?? []).forEach((id, challengeIndex) => {
      if (!state.missionDefinitions.some((mission) => mission.id === id)) {
        addError(errors, "INVALID_REFERENCE", `${path}.challengeMissionIds[${challengeIndex}]`, `La misión ${id} no existe.`);
      }
    });
    [...(boss.requirementGroups ?? []), ...(boss.finalRequirementGroups ?? [])].forEach((group, groupIndex) => {
      const groupPath = `${path}.requirementGroups[${groupIndex}]`;
      if (!group.id || !["ALL", "ANY"].includes(group.mode) || !Array.isArray(group.requirements) || group.requirements.length === 0) {
        addError(errors, "INVALID_REQUIREMENT_GROUP", groupPath, "Grupo de requisitos inválido.");
      }
      (group.requirements ?? []).forEach((requirement, requirementIndex) => {
        const requirementPath = `${groupPath}.requirements[${requirementIndex}]`;
        const validTypes = ["MISSION_COMPLETED", "DOMAIN_TIER_PROGRESS", "DOMAIN_TIER_MASTERED", "MILESTONE_COMPLETED", "DOMAIN_CONDITION_NOT", "BOSS_DEFEATED"];
        if (!validTypes.includes(requirement.type)) addError(errors, "INVALID_REQUIREMENT_GROUP", requirementPath, "Tipo de requisito no soportado.");
        if (requirement.missionDefinitionId && !missionDefinitionIds.has(requirement.missionDefinitionId)) addError(errors, "INVALID_REFERENCE", requirementPath, "Misión requerida inexistente.");
        if (requirement.domainTierId && !tierIds.has(requirement.domainTierId)) addError(errors, "INVALID_REFERENCE", requirementPath, "Tier requerido inexistente.");
        if (requirement.milestoneId && !milestoneIds.has(requirement.milestoneId)) addError(errors, "INVALID_REFERENCE", requirementPath, "Hito requerido inexistente.");
        if (requirement.bossId && !bossIds.has(requirement.bossId)) addError(errors, "INVALID_REFERENCE", requirementPath, "Jefe requerido inexistente.");
        if (requirement.domainId && !domainIds.has(requirement.domainId)) addError(errors, "INVALID_REFERENCE", requirementPath, "Dominio requerido inexistente.");
      });
    });
  });

  state.milestones.forEach((milestone, index) => {
    const path = `$.milestones[${index}]`;
    validateEnum(errors, MilestoneStatus, milestone.status, `${path}.status`);
    if (!domainIds.has(milestone.domainId) || !tierIds.has(milestone.domainTierId) || !worldLevelIds.has(milestone.worldLevelId)) {
      addError(errors, "INVALID_REFERENCE", path, "El hito contiene referencias inválidas.");
    }
    if (!Number.isFinite(milestone.weight) || milestone.weight < 0) {
      addError(errors, "INVALID_MILESTONE", `${path}.weight`, "El peso del hito debe ser no negativo.");
    }
    if (milestone.completedAt) validateIsoDate(errors, milestone.completedAt, `${path}.completedAt`);
    if (!Array.isArray(milestone.evidenceEntries)) addError(errors, "INVALID_EVIDENCE", `${path}.evidenceEntries`, "evidenceEntries debe ser un arreglo.");
    (milestone.requirements ?? []).forEach((requirement, requirementIndex) => {
      if (requirement.type === "MISSION_COMPLETED" &&
          !state.missionDefinitions.some((mission) => mission.id === requirement.missionDefinitionId)) {
        addError(errors, "INVALID_REFERENCE", `${path}.requirements[${requirementIndex}]`, "Misión requerida inexistente.");
      }
    });
  });
  state.domainTiers.forEach((tier, index) => {
    const milestones = state.milestones.filter((item) => item.domainTierId === tier.id);
    if (milestones.length > 0 && milestones.reduce((sum, item) => sum + item.weight, 0) !== 100) {
      addError(errors, "INVALID_MILESTONE_WEIGHT", `$.domainTiers[${index}]`, "Los pesos de hitos del Tier deben sumar 100.");
    }
  });

  state.missionDefinitions.forEach((mission, index) => {
    const path = `$.missionDefinitions[${index}]`;
    validateEnum(errors, MissionType, mission.type, `${path}.type`);
    validateEnum(errors, MissionScope, mission.scope, `${path}.scope`);
    validateEnum(errors, MissionCriticality, mission.criticality, `${path}.criticality`);
    validateEnum(errors, MissionPriority, mission.priority, `${path}.priority`);
    validateEnum(errors, MissionDifficulty, mission.difficulty, `${path}.difficulty`);
    validateEnum(errors, RetryPolicy, mission.retryPolicy, `${path}.retryPolicy`);

    if (!worldLevelIds.has(mission.worldLevelId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.worldLevelId`, `El nivel ${mission.worldLevelId} no existe.`);
    }
    if (!domainIds.has(mission.primaryDomainId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.primaryDomainId`, `El Dominio ${mission.primaryDomainId} no existe.`);
    }
    if (!tierIds.has(mission.primaryDomainTierId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.primaryDomainTierId`, `El Tier ${mission.primaryDomainTierId} no existe.`);
    } else {
      const tier = state.domainTiers.find((candidate) => candidate.id === mission.primaryDomainTierId);
      if (tier.domainId !== mission.primaryDomainId) {
        addError(
          errors,
          "MISMATCHED_REFERENCE",
          `${path}.primaryDomainTierId`,
          `El Tier ${mission.primaryDomainTierId} no pertenece al Dominio ${mission.primaryDomainId}.`,
        );
      }
    }
    mission.relatedDomainIds?.forEach((domainId, relatedIndex) => {
      if (!domainIds.has(domainId)) {
        addError(errors, "INVALID_REFERENCE", `${path}.relatedDomainIds[${relatedIndex}]`, `El Dominio ${domainId} no existe.`);
      }
    });
    if (mission.scope === MissionScope.BOSS && !bossIds.has(mission.bossId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.bossId`, `La misión BOSS debe referenciar un jefe válido.`);
    }

    const objectiveIds = validateUniqueIds(errors, mission.objectives ?? [], `${path}.objectives`);
    const requiredObjectives = (mission.objectives ?? []).filter((objective) => objective.required);
    const totalWeight = requiredObjectives.reduce((total, objective) => total + objective.weight, 0);
    if (totalWeight !== 100) {
      addError(errors, "INVALID_OBJECTIVE_WEIGHT", `${path}.objectives`, "Los objetivos obligatorios deben sumar 100.", totalWeight);
    }
    if (objectiveIds.size !== (mission.objectives ?? []).length) return;

    (mission.objectives ?? []).forEach((objective, objectiveIndex) => {
      const objectivePath = `${path}.objectives[${objectiveIndex}]`;
      validateEnum(errors, ObjectiveType, objective.type, `${objectivePath}.type`);
      validateEnum(errors, EvidenceLevel, objective.evidenceLevel, `${objectivePath}.evidenceLevel`);
      if (objective.responseFormat !== "TEXT") {
        addError(errors, "INVALID_RESPONSE_FORMAT", `${objectivePath}.responseFormat`, "La misión demo requiere evidencia de texto.");
      }
    });
    const rewardIds = validateUniqueIds(errors, mission.rewards ?? [], `${path}.rewards`);
    if (rewardIds.size !== (mission.rewards ?? []).length) return;
    (mission.rewards ?? []).forEach((reward, rewardIndex) => {
      const rewardPath = `${path}.rewards[${rewardIndex}]`;
      if (reward.rewardType !== "XP" || !Number.isFinite(reward.amount) || reward.amount <= 0) {
        addError(errors, "INVALID_REWARD", rewardPath, "La recompensa XP debe tener una cantidad positiva.");
      }
      const targetTier = state.domainTiers.find((tier) => tier.id === reward.targetId);
      if (!targetTier || targetTier.domainId !== reward.domainId) {
        addError(errors, "INVALID_REWARD", `${rewardPath}.targetId`, "La recompensa debe referenciar un Tier de su Dominio.");
      }
    });
  });

  state.missionInstances.forEach((mission, index) => {
    const path = `$.missionInstances[${index}]`;
    validateEnum(errors, MissionStatus, mission.status, `${path}.status`);
    if (!state.missionDefinitions.some((definition) => definition.id === mission.definitionId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.definitionId`, `La definición ${mission.definitionId} no existe.`);
    }
    if (mission.startedAt) validateIsoDate(errors, mission.startedAt, `${path}.startedAt`);
    if (mission.closedAt) validateIsoDate(errors, mission.closedAt, `${path}.closedAt`);
    if (mission.completedAt) validateIsoDate(errors, mission.completedAt, `${path}.completedAt`);
    if (!mission.objectiveProgress || typeof mission.objectiveProgress !== "object" || Array.isArray(mission.objectiveProgress)) {
      addError(errors, "INVALID_OBJECTIVE_VALUE", `${path}.objectiveProgress`, "objectiveProgress debe ser un objeto.");
    }
    if (!Array.isArray(mission.evidenceEntries)) {
      addError(errors, "INVALID_EVIDENCE", `${path}.evidenceEntries`, "evidenceEntries debe ser un arreglo.");
    } else {
      validateUniqueIds(errors, mission.evidenceEntries, `${path}.evidenceEntries`);
      const definition = state.missionDefinitions.find((item) => item.id === mission.definitionId);
      mission.evidenceEntries.forEach((entry, entryIndex) => {
        const entryPath = `${path}.evidenceEntries[${entryIndex}]`;
        if (!definition?.objectives.some((objective) => objective.id === entry.objectiveId)) {
          addError(errors, "OBJECTIVE_NOT_FOUND", `${entryPath}.objectiveId`, "La evidencia referencia un objetivo inexistente.");
        }
        const objective = definition?.objectives.find((item) => item.id === entry.objectiveId);
        if (objective && !validateEvidence(objective, entry.evidence)) {
          addError(errors, "INVALID_EVIDENCE", `${entryPath}.evidence`, "La evidencia no satisface la política del objetivo.");
        }
        validateEnum(errors, EvidenceLevel, entry.evidence?.level, `${entryPath}.evidence.level`);
        validateIsoDate(errors, entry.submittedAt, `${entryPath}.submittedAt`);
      });
      Object.entries(mission.objectiveProgress ?? {}).forEach(([objectiveId, value]) => {
        const objective = definition?.objectives.find((item) => item.id === objectiveId);
        if (!objective || !validateObjectiveValue(objective, value)) {
          addError(errors, "INVALID_OBJECTIVE_VALUE", `${path}.objectiveProgress.${objectiveId}`, "Progreso de objetivo inválido.");
        }
      });
    }
  });

  const rewardIds = validateUniqueIds(errors, state.rewardTransactions, "$.rewardTransactions");
  state.rewardTransactions.forEach((transaction, index) => {
    const path = `$.rewardTransactions[${index}]`;
    if (!transaction.commandId || !transaction.sourceId || !transaction.rewardDefinitionId ||
        transaction.rewardType !== "XP" || !Number.isFinite(transaction.value) || transaction.value <= 0) {
      addError(errors, "INVALID_REWARD", path, "Transacción de recompensa incompleta o inválida.");
    }
    if (!Array.isArray(transaction.xpTransactionIds)) {
      addError(errors, "INVALID_REWARD", `${path}.xpTransactionIds`, "xpTransactionIds debe ser un arreglo.");
    }
    validateIsoDate(errors, transaction.createdAt, `${path}.createdAt`);
  });
  if (rewardIds.size !== state.rewardTransactions.length) {
    addError(errors, "INVALID_REWARD", "$.rewardTransactions", "Las recompensas no pueden duplicarse.");
  }

  const xpIds = validateUniqueIds(errors, state.xpTransactions, "$.xpTransactions");
  state.xpTransactions.forEach((transaction, index) => {
    const path = `$.xpTransactions[${index}]`;
    const tier = state.domainTiers.find((candidate) => candidate.id === transaction.domainTierId);
    const reward = state.rewardTransactions.find((candidate) => candidate.id === transaction.rewardTransactionId);
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0 || !domainIds.has(transaction.domainId) ||
        !tier || tier.domainId !== transaction.domainId || !reward || !reward.xpTransactionIds.includes(transaction.id)) {
      addError(errors, "INVALID_XP_TRANSACTION", path, "Transacción XP inválida o sin recompensa auditable.");
    }
    validateIsoDate(errors, transaction.createdAt, `${path}.createdAt`);
  });
  if (xpIds.size !== state.xpTransactions.length) {
    addError(errors, "INVALID_XP_TRANSACTION", "$.xpTransactions", "Las transacciones XP no pueden duplicarse.");
  }
  state.rewardTransactions.forEach((reward, rewardIndex) => {
    reward.xpTransactionIds?.forEach((id, xpIndex) => {
      if (!state.xpTransactions.some((transaction) => transaction.id === id && transaction.rewardTransactionId === reward.id)) {
        addError(errors, "INVALID_REFERENCE", `$.rewardTransactions[${rewardIndex}].xpTransactionIds[${xpIndex}]`, "Referencia XP inválida.");
      }
    });
  });

  if (!Array.isArray(state.system?.conditionSignals)) {
    addError(errors, "INVALID_RUNTIME_STATE", "$.system.conditionSignals", "conditionSignals debe ser un arreglo.");
  } else {
    validateUniqueIds(errors, state.system.conditionSignals, "$.system.conditionSignals");
    state.system.conditionSignals.forEach((signal, index) => {
      const path = `$.system.conditionSignals[${index}]`;
      if (!domainIds.has(signal.domainId)) addError(errors, "INVALID_REFERENCE", `${path}.domainId`, "Dominio de señal inexistente.");
      validateEnum(errors, ConditionSignalType, signal.type, `${path}.type`);
      validateEnum(errors, ConditionSignalSeverity, signal.severity, `${path}.severity`);
      validateIsoDate(errors, signal.occurredAt, `${path}.occurredAt`);
      if (signal.expiresAt) validateIsoDate(errors, signal.expiresAt, `${path}.expiresAt`);
      if (signal.resolvedAt) validateIsoDate(errors, signal.resolvedAt, `${path}.resolvedAt`);
    });
  }
  if (!Array.isArray(state.system?.restorationHistory)) {
    addError(errors, "INVALID_RUNTIME_STATE", "$.system.restorationHistory", "restorationHistory debe ser un arreglo.");
  }

  state.contributions.forEach((contribution, index) => {
    const path = `$.contributions[${index}]`;
    if (!domainIds.has(contribution.domainId) || !Number.isFinite(contribution.amount) || contribution.amount <= 0 ||
        !contribution.sourceType || !contribution.sourceId || !contribution.contributionType || !contribution.commandId) {
      addError(errors, "INVALID_CONTRIBUTION", path, "Contribución incompleta o inválida.");
    }
    validateIsoDate(errors, contribution.createdAt, `${path}.createdAt`);
  });
  if (state.xpTransactions.some((transaction) => transaction.domainId === "legado")) {
    addError(errors, "LEGACY_DOMAIN_INVALID_STATE", "$.xpTransactions", "Legado no puede recibir XP.");
  }

  const missionAvailability = state.system?.missionAvailability;
  if (!missionAvailability || typeof missionAvailability !== "object" || Array.isArray(missionAvailability)) {
    addError(
      errors,
      "INVALID_RUNTIME_STATE",
      "$.system.missionAvailability",
      "missionAvailability debe ser un objeto indexado por definición.",
    );
  } else {
    Object.entries(missionAvailability).forEach(([definitionId, status]) => {
      if (!missionDefinitionIds.has(definitionId)) {
        addError(
          errors,
          "INVALID_REFERENCE",
          `$.system.missionAvailability.${definitionId}`,
          `La definición ${definitionId} no existe.`,
        );
      }
      validateEnum(errors, MissionStatus, status, `$.system.missionAvailability.${definitionId}`);
    });
  }

  state.eventLog.forEach((event, index) => {
    const path = `$.eventLog[${index}]`;
    if (!event || typeof event !== "object") {
      addError(errors, "INVALID_EVENT", path, "Cada evento debe ser un objeto.");
      return;
    }
    if (typeof event.id !== "string" || !event.id) addError(errors, "INVALID_EVENT", `${path}.id`, "Evento sin id.");
    validateEnum(errors, EventType, event.type, `${path}.type`);
    validateIsoDate(errors, event.timestamp, `${path}.timestamp`);
    if (event.actor === undefined || event.actor === null) {
      addError(errors, "INVALID_EVENT", `${path}.actor`, "Evento sin actor.");
    }
    if (typeof event.source !== "string" || !event.source) {
      addError(errors, "INVALID_EVENT", `${path}.source`, "Evento sin source.");
    }
    if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
      addError(errors, "INVALID_EVENT", `${path}.payload`, "El payload del evento debe ser un objeto.");
    }
    if (!event.metadata || event.metadata.schemaVersion !== state.schemaVersion) {
      addError(errors, "INVALID_EVENT", `${path}.metadata.schemaVersion`, "El evento debe usar el schemaVersion actual.");
    }
  });

  try {
    JSON.stringify(state);
  } catch (error) {
    addError(errors, "JSON_SERIALIZATION_FAILED", "$", `JSON.stringify falló: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertValidWorldState(state) {
  const result = validateWorldState(state);
  if (!result.valid) throw new WorldStateValidationError(result.errors);
  return state;
}
