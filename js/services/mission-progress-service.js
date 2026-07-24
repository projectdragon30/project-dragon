import { EvidenceLevel, ObjectiveType, isEnumValue } from "../constants/game-enums.js";

export function clampProgress(value) {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
}

function validText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateObjectiveValue(objective, value) {
  switch (objective?.type) {
    case ObjectiveType.BOOLEAN:
      return typeof value === "boolean";
    case ObjectiveType.COUNT:
    case ObjectiveType.THRESHOLD:
      return typeof value === "number" && Number.isFinite(value) && value >= 0;
    case ObjectiveType.STREAK:
      return Number.isInteger(value) && value >= 0;
    case ObjectiveType.CHECKLIST:
      return Array.isArray(value) && value.every(validText);
    case ObjectiveType.EVIDENCE:
      return false;
    case ObjectiveType.DECISION:
      return objective.allowedValues
        ? objective.allowedValues.includes(value)
        : validText(value);
    default:
      return false;
  }
}

export function validateEvidence(objective, evidence) {
  if (!objective || !evidence || typeof evidence !== "object" || Array.isArray(evidence)) return false;
  if (![ObjectiveType.EVIDENCE, ObjectiveType.DECISION].includes(objective.type)) return false;
  if (!isEnumValue(EvidenceLevel, evidence.level)) return false;
  if (evidence.level !== objective.evidenceLevel) return false;
  if (evidence.kind !== (objective.responseFormat ?? "TEXT")) return false;
  return evidence.kind === "TEXT" ? validText(evidence.value) : evidence.value !== undefined;
}

export function calculateObjectiveProgress(objective, value, evidenceEntries = []) {
  switch (objective?.type) {
    case ObjectiveType.BOOLEAN:
      return value === true ? 1 : 0;
    case ObjectiveType.COUNT:
    case ObjectiveType.STREAK:
    case ObjectiveType.THRESHOLD:
      return objective.target > 0 ? clampProgress(value / objective.target) : 0;
    case ObjectiveType.CHECKLIST: {
      const requiredItems = objective.requiredItems ?? objective.items ?? [];
      if (requiredItems.length === 0) return 0;
      const completed = new Set(Array.isArray(value) ? value : []);
      return clampProgress(requiredItems.filter((item) => completed.has(item)).length / requiredItems.length);
    }
    case ObjectiveType.EVIDENCE:
      return evidenceEntries.some((entry) => entry.objectiveId === objective.id && validateEvidence(objective, entry.evidence)) ? 1 : 0;
    case ObjectiveType.DECISION:
      return validateObjectiveValue(objective, value) ||
        evidenceEntries.some((entry) => entry.objectiveId === objective.id && validateEvidence(objective, entry.evidence))
        ? 1
        : 0;
    default:
      return 0;
  }
}

export function calculateMissionProgress(definition, instance) {
  const required = (definition?.objectives ?? []).filter((objective) => objective.required);
  return clampProgress(required.reduce((sum, objective) => {
    const value = instance?.objectiveProgress?.[objective.id];
    return sum + calculateObjectiveProgress(objective, value, instance?.evidenceEntries ?? []) * objective.weight;
  }, 0) / 100);
}

export function getMissionCompletionEligibility(definition, instance) {
  const pendingObjectiveIds = (definition?.objectives ?? [])
    .filter((objective) => objective.required)
    .filter((objective) =>
      calculateObjectiveProgress(
        objective,
        instance?.objectiveProgress?.[objective.id],
        instance?.evidenceEntries ?? [],
      ) < 1)
    .map((objective) => objective.id);
  return {
    eligible: pendingObjectiveIds.length === 0,
    pendingObjectiveIds,
    progress: calculateMissionProgress(definition, instance),
  };
}
