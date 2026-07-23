import {
  BossScope,
  BossStatus,
  DomainConditionState,
  DomainProgressionState,
  EvidenceLevel,
  EventType,
  MasteryStatus,
  MissionCriticality,
  MissionDifficulty,
  MissionPriority,
  MissionScope,
  MissionStatus,
  MissionType,
  ObjectiveType,
  RetryPolicy,
  isEnumValue,
} from "../constants/game-enums.js";

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
  validateUniqueIds(errors, state.missionDefinitions, "$.missionDefinitions");
  validateUniqueIds(errors, state.missionInstances, "$.missionInstances");
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

    if (domain.id === "legado" && domain.progressionState !== DomainProgressionState.CONSEQUENCE) {
      addError(errors, "INVALID_LEGACY_STATE", `${path}.progressionState`, "Legado debe usar CONSEQUENCE.");
    }
  });

  state.domainTiers.forEach((tier, index) => {
    if (!domainIds.has(tier.domainId)) {
      addError(
        errors,
        "INVALID_REFERENCE",
        `$.domainTiers[${index}].domainId`,
        `El Dominio ${tier.domainId} no existe.`,
        tier.domainId,
      );
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
  });

  state.missionInstances.forEach((mission, index) => {
    const path = `$.missionInstances[${index}]`;
    validateEnum(errors, MissionStatus, mission.status, `${path}.status`);
    if (!state.missionDefinitions.some((definition) => definition.id === mission.definitionId)) {
      addError(errors, "INVALID_REFERENCE", `${path}.definitionId`, `La definición ${mission.definitionId} no existe.`);
    }
    if (mission.startedAt) validateIsoDate(errors, mission.startedAt, `${path}.startedAt`);
    if (mission.closedAt) validateIsoDate(errors, mission.closedAt, `${path}.closedAt`);
  });

  const missionDefinitionIds = new Set(state.missionDefinitions.map((definition) => definition.id));
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
