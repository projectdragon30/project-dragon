function createEnum(values) {
  return Object.freeze(Object.fromEntries(values.map((value) => [value, value])));
}

export const DomainProgressionState = createEnum([
  "FUTURE",
  "LOCKED",
  "AVAILABLE",
  "ACTIVE",
  "MASTERED",
  "CONSEQUENCE",
]);

export const DomainConditionState = createEnum([
  "STABLE",
  "STRAINED",
  "CORRUPTED",
  "RECOVERING",
]);

export const MasteryStatus = createEnum([
  "NOT_ELIGIBLE",
  "ELIGIBLE",
  "IN_REVIEW",
  "MASTERED",
]);

export const MissionStatus = createEnum([
  "HIDDEN",
  "LOCKED",
  "AVAILABLE",
  "ACTIVE",
  "COMPLETED",
  "FAILED",
  "ABANDONED",
  "EXPIRED",
]);

export const MissionType = createEnum([
  "INTRODUCTION",
  "ACTION",
  "CONSISTENCY",
  "MILESTONE",
  "REFLECTION",
  "CHALLENGE",
  "RESTORATION",
]);

export const MissionScope = createEnum([
  "DOMAIN",
  "LEVEL",
  "BOSS",
  "TRANSVERSAL",
  "RESTORATION",
]);

export const ObjectiveType = createEnum([
  "BOOLEAN",
  "COUNT",
  "STREAK",
  "THRESHOLD",
  "CHECKLIST",
  "EVIDENCE",
  "DECISION",
]);

export const EvidenceLevel = createEnum([
  "SELF_REPORTED",
  "SUPPORTED",
  "VERIFIED",
]);

export const MissionCriticality = createEnum([
  "OPTIONAL",
  "STANDARD",
  "CORE",
  "MASTERY",
]);

export const MissionPriority = createEnum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const MissionDifficulty = createEnum([
  "EASY",
  "STANDARD",
  "HARD",
  "ELITE",
]);

export const RetryPolicy = createEnum([
  "NO_RETRY",
  "IMMEDIATE",
  "AFTER_REVIEW",
  "NEXT_CYCLE",
]);

export const BossScope = createEnum([
  "LEVEL",
  "DOMAIN",
  "TRANSVERSAL",
]);

export const BossStatus = createEnum([
  "HIDDEN",
  "REVEALED",
  "CHALLENGE_AVAILABLE",
  "CHALLENGED",
  "DEFEATED",
]);

export const CommandType = createEnum([
  "MAKE_DOMAIN_AVAILABLE",
  "ACTIVATE_DOMAIN",
  "SET_DOMAIN_CONDITION",
  "START_DOMAIN_RECOVERY",
  "REVEAL_MISSION",
  "MAKE_MISSION_AVAILABLE",
  "START_MISSION",
  "COMPLETE_MISSION",
  "FAIL_MISSION",
  "ABANDON_MISSION",
  "EXPIRE_MISSION",
]);

export const EventType = createEnum([
  "DOMAIN_AVAILABLE",
  "DOMAIN_ACTIVATED",
  "DOMAIN_STRAINED",
  "DOMAIN_CORRUPTED",
  "DOMAIN_RECOVERY_STARTED",
  "DOMAIN_RESTORED",
  "DOMAIN_RECOVERY_INTERRUPTED",
  "MISSION_REVEALED",
  "MISSION_AVAILABLE",
  "MISSION_STARTED",
  "MISSION_COMPLETED",
  "MISSION_FAILED",
  "MISSION_ABANDONED",
  "MISSION_EXPIRED",
]);

export const EngineErrorCode = createEnum([
  "INVALID_COMMAND",
  "ENTITY_NOT_FOUND",
  "DOMAIN_NOT_FOUND",
  "MISSION_NOT_FOUND",
  "MISSION_INSTANCE_NOT_FOUND",
  "INVALID_TRANSITION",
  "DOMAIN_NOT_AVAILABLE",
  "MISSION_NOT_AVAILABLE",
  "MISSION_NOT_ACTIVE",
  "MISSION_ALREADY_CLOSED",
  "INVALID_PAYLOAD",
]);

export const GameEnums = Object.freeze({
  DomainProgressionState,
  DomainConditionState,
  MasteryStatus,
  MissionStatus,
  MissionType,
  MissionScope,
  ObjectiveType,
  EvidenceLevel,
  MissionCriticality,
  MissionPriority,
  MissionDifficulty,
  RetryPolicy,
  BossScope,
  BossStatus,
  CommandType,
  EventType,
  EngineErrorCode,
});

export function isEnumValue(enumCatalog, value) {
  return Object.hasOwn(enumCatalog, value);
}
