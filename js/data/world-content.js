import {
  BossScope,
  BossStatus,
  DomainTierStatus,
  DomainConditionState,
  DomainProgressionState,
  EvidenceLevel,
  MasteryStatus,
  MissionCriticality,
  MissionDifficulty,
  MissionPriority,
  MissionScope,
  MissionType,
  ObjectiveType,
  MilestoneStatus,
  RetryPolicy,
} from "../constants/game-enums.js";

export const WORLD_LEVELS = Object.freeze([
  Object.freeze({
    id: "awakening",
    title: "NIVEL I — DESPERTAR",
    mainMission: "Recuperar el control de mi vida",
    completionEnabled: false,
    requirements: Object.freeze({
      requiredBossIds: Object.freeze(["piloto-automatico"]),
      requiredDomainTierIds: Object.freeze(["disciplina-tier-1"]),
      requiredMissionIds: Object.freeze(["reconocer-piloto-automatico-demo"]),
      requiredMilestoneIds: Object.freeze(["disciplina-hito-tecnico-demo"]),
    }),
    metadata: Object.freeze({
      contentStatus: "DEMO",
      notes: "PLACEHOLDER: el Nivel I no puede completarse con contenido provisional.",
    }),
  }),
]);

const domainDefinitions = [
  ["vida", DomainProgressionState.ACTIVE],
  ["mente", DomainProgressionState.ACTIVE],
  ["disciplina", DomainProgressionState.ACTIVE],
  ["imperio", DomainProgressionState.ACTIVE],
  ["proposito", DomainProgressionState.ACTIVE],
  ["relaciones", DomainProgressionState.FUTURE],
  ["sabiduria", DomainProgressionState.FUTURE],
  ["legado", DomainProgressionState.CONSEQUENCE],
];

export const DOMAINS = Object.freeze(
  domainDefinitions.map(([id, progressionState]) =>
    Object.freeze({
      id,
      progressionState,
      conditionState: DomainConditionState.STABLE,
      masteryStatus: MasteryStatus.NOT_ELIGIBLE,
      totalXP: 0,
    }),
  ),
);

export const DOMAIN_TIERS = Object.freeze(
  domainDefinitions.map(([domainId]) =>
    Object.freeze({
      id: `${domainId}-tier-1`,
      domainId,
      order: 1,
      status: DomainTierStatus.ACTIVE,
      masteryStatus: MasteryStatus.NOT_ELIGIBLE,
      masteredAt: null,
      tierXP: 0,
      progressConfig: Object.freeze({
        coreMissions: 70,
        masteryMissions: 20,
        milestones: 5,
        bossContribution: 5,
      }),
      masteryRequirements: Object.freeze({
        requiredXP: domainId === "disciplina" ? 10 : 0,
        minimumProgress: domainId === "disciplina" ? 0.8 : 1,
        requiredMissionIds: Object.freeze(domainId === "disciplina" ? ["reconocer-piloto-automatico-demo"] : []),
        requiredMilestoneIds: Object.freeze(domainId === "disciplina" ? ["disciplina-hito-tecnico-demo"] : []),
        requiredBossIds: Object.freeze(domainId === "disciplina" ? ["piloto-automatico"] : []),
        blockedConditionStates: Object.freeze(["CORRUPTED"]),
      }),
    }),
  ),
);

export const BOSSES = Object.freeze([
  Object.freeze({
    id: "piloto-automatico",
    name: "EL PILOTO AUTOMÁTICO",
    scope: BossScope.LEVEL,
    worldLevelId: "awakening",
    status: BossStatus.REVEALED,
    challengeMissionIds: Object.freeze(["piloto-automatico-desafio-tecnico-demo"]),
    requirementGroups: Object.freeze([
      Object.freeze({
        id: "piloto-automatico-disponibilidad-demo",
        mode: "ALL",
        required: true,
        requirements: Object.freeze([
          Object.freeze({ type: "MISSION_COMPLETED", missionDefinitionId: "reconocer-piloto-automatico-demo" }),
          Object.freeze({ type: "DOMAIN_TIER_PROGRESS", domainTierId: "disciplina-tier-1", minimum: 0.7 }),
          Object.freeze({ type: "DOMAIN_CONDITION_NOT", domainId: "disciplina", conditionState: "CORRUPTED" }),
        ]),
      }),
    ]),
    finalRequirementGroups: Object.freeze([
      Object.freeze({
        id: "piloto-automatico-cierre-demo",
        mode: "ALL",
        required: true,
        requirements: Object.freeze([
          Object.freeze({ type: "MISSION_COMPLETED", missionDefinitionId: "piloto-automatico-desafio-tecnico-demo" }),
        ]),
      }),
    ]),
    metadata: Object.freeze({
      contentStatus: "DEMO",
      notes: "PLACEHOLDER: requisitos técnicos provisionales sin recompensa.",
    }),
  }),
]);

export const MISSION_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "reconocer-piloto-automatico-demo",
    title: "RECONOCER EL PILOTO AUTOMÁTICO",
    contentStatus: "DEMO",
    type: MissionType.REFLECTION,
    scope: MissionScope.BOSS,
    worldLevelId: "awakening",
    bossId: "piloto-automatico",
    primaryDomainId: "disciplina",
    primaryDomainTierId: "disciplina-tier-1",
    relatedDomainIds: Object.freeze(["mente", "proposito"]),
    criticality: MissionCriticality.CORE,
    priority: MissionPriority.HIGH,
    difficulty: MissionDifficulty.STANDARD,
    retryPolicy: RetryPolicy.AFTER_REVIEW,
    objectives: Object.freeze([
      Object.freeze({
        id: "identificar-disparador",
        description: "Identificar un disparador.",
        required: true,
        weight: 25,
        type: ObjectiveType.EVIDENCE,
        evidenceLevel: EvidenceLevel.SELF_REPORTED,
        responseFormat: "TEXT",
      }),
      Object.freeze({
        id: "identificar-conducta-automatica",
        description: "Identificar la conducta automática.",
        required: true,
        weight: 25,
        type: ObjectiveType.EVIDENCE,
        evidenceLevel: EvidenceLevel.SELF_REPORTED,
        responseFormat: "TEXT",
      }),
      Object.freeze({
        id: "identificar-consecuencia",
        description: "Identificar su consecuencia.",
        required: true,
        weight: 25,
        type: ObjectiveType.EVIDENCE,
        evidenceLevel: EvidenceLevel.SELF_REPORTED,
        responseFormat: "TEXT",
      }),
      Object.freeze({
        id: "definir-respuesta-consciente",
        description: "Definir una respuesta consciente alternativa.",
        required: true,
        weight: 25,
        type: ObjectiveType.DECISION,
        evidenceLevel: EvidenceLevel.SELF_REPORTED,
        responseFormat: "TEXT",
      }),
    ]),
    rewards: Object.freeze([
      Object.freeze({
        id: "demo-disciplina-xp-10",
        rewardType: "XP",
        targetType: "DOMAIN_TIER",
        targetId: "disciplina-tier-1",
        domainId: "disciplina",
        amount: 10,
        metadata: Object.freeze({
          contentStatus: "DEMO",
          notes: "PLACEHOLDER: valor provisional de demostración para validar el motor de XP.",
        }),
      }),
    ]),
  }),
  Object.freeze({
    id: "piloto-automatico-desafio-tecnico-demo",
    title: "VALIDACIÓN TÉCNICA DEMO DEL DESAFÍO",
    contentStatus: "DEMO",
    type: MissionType.CHALLENGE,
    scope: MissionScope.BOSS,
    worldLevelId: "awakening",
    bossId: "piloto-automatico",
    primaryDomainId: "disciplina",
    primaryDomainTierId: "disciplina-tier-1",
    relatedDomainIds: Object.freeze([]),
    criticality: MissionCriticality.STANDARD,
    priority: MissionPriority.HIGH,
    difficulty: MissionDifficulty.STANDARD,
    retryPolicy: RetryPolicy.NO_RETRY,
    objectives: Object.freeze([
      Object.freeze({
        id: "confirmar-desafio-tecnico-demo",
        description: "PLACEHOLDER técnico verificable.",
        required: true,
        weight: 100,
        type: ObjectiveType.BOOLEAN,
        evidenceLevel: EvidenceLevel.SELF_REPORTED,
        responseFormat: "TEXT",
      }),
    ]),
    rewards: Object.freeze([]),
    metadata: Object.freeze({ contentStatus: "DEMO", notes: "PLACEHOLDER técnico sin lore ni recompensas." }),
  }),
]);

export const MILESTONES = Object.freeze([
  Object.freeze({
    id: "disciplina-hito-tecnico-demo",
    domainId: "disciplina",
    domainTierId: "disciplina-tier-1",
    worldLevelId: "awakening",
    title: "HITO TÉCNICO DEMO",
    description: "PLACEHOLDER técnico verificable.",
    required: true,
    weight: 100,
    status: MilestoneStatus.LOCKED,
    requirements: Object.freeze([
      Object.freeze({ type: "MISSION_COMPLETED", missionDefinitionId: "reconocer-piloto-automatico-demo" }),
    ]),
    completedAt: null,
    evidenceEntries: Object.freeze([]),
    metadata: Object.freeze({ contentStatus: "DEMO", notes: "PLACEHOLDER técnico sin recompensa ni lore." }),
  }),
]);

export const INITIAL_WORLD_CONTENT = Object.freeze({
  worldLevels: WORLD_LEVELS,
  domains: DOMAINS,
  domainTiers: DOMAIN_TIERS,
  affinities: Object.freeze([]),
  contributions: Object.freeze([]),
  missionDefinitions: MISSION_DEFINITIONS,
  milestones: MILESTONES,
  bosses: BOSSES,
});
