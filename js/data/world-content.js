import {
  BossScope,
  BossStatus,
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
  RetryPolicy,
} from "../constants/game-enums.js";

export const WORLD_LEVELS = Object.freeze([
  Object.freeze({
    id: "awakening",
    title: "NIVEL I — DESPERTAR",
    mainMission: "Recuperar el control de mi vida",
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
      tierXP: 0,
      progressConfig: Object.freeze({
        coreMissions: 70,
        masteryMissions: 20,
        milestones: 5,
        bossContribution: 5,
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
]);

export const INITIAL_WORLD_CONTENT = Object.freeze({
  worldLevels: WORLD_LEVELS,
  domains: DOMAINS,
  domainTiers: DOMAIN_TIERS,
  affinities: Object.freeze([]),
  contributions: Object.freeze([]),
  missionDefinitions: MISSION_DEFINITIONS,
  milestones: Object.freeze([]),
  bosses: BOSSES,
});
