import { DomainConditionState } from "../constants/game-enums.js";

export const CONDITION_POLICY_DEMO = Object.freeze({
  severityWeights: Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 4, CRITICAL: 8 }),
  strainedThreshold: 4,
  corruptedThreshold: 8,
  requiredHighSignals: 2,
  metadata: Object.freeze({ contentStatus: "DEMO", notes: "PLACEHOLDER técnico centralizado." }),
});

export function selectActiveSignals(state, domainId) {
  const now = Date.parse(state.metadata.updatedAt);
  return state.system.conditionSignals.filter((signal) =>
    signal.domainId === domainId && !signal.resolvedAt &&
    (!signal.expiresAt || Date.parse(signal.expiresAt) > now));
}

export function evaluateDomainCondition(state, domainId) {
  const domain = state.domains.find((item) => item.id === domainId);
  if (!domain) return null;
  const activeSignals = selectActiveSignals(state, domainId);
  const negatives = activeSignals.filter((signal) => signal.type === "NEGATIVE");
  const offsets = activeSignals.filter((signal) => signal.type !== "NEGATIVE");
  const negativeScore = negatives.reduce((sum, signal) => sum + CONDITION_POLICY_DEMO.severityWeights[signal.severity], 0);
  const offsetScore = offsets.reduce((sum, signal) => sum + CONDITION_POLICY_DEMO.severityWeights[signal.severity], 0);
  const score = Math.max(0, negativeScore - offsetScore);
  const critical = negatives.some((signal) => signal.severity === "CRITICAL");
  const highCount = negatives.filter((signal) => signal.severity === "HIGH").length;
  const corrupted = critical || highCount >= CONDITION_POLICY_DEMO.requiredHighSignals ||
    score >= CONDITION_POLICY_DEMO.corruptedThreshold;
  const recommendedCondition = corrupted
    ? DomainConditionState.CORRUPTED
    : score >= CONDITION_POLICY_DEMO.strainedThreshold
      ? DomainConditionState.STRAINED
      : DomainConditionState.STABLE;
  const checks = [
    { id: "criticalSignal", satisfied: critical, current: critical, required: true },
    { id: "highSignalCount", satisfied: highCount >= 2, current: highCount, required: 2 },
    { id: "deteriorationScore", satisfied: score >= 8, current: score, required: 8 },
  ];
  return {
    domainId,
    currentCondition: domain.conditionState,
    recommendedCondition,
    score,
    checks,
    activeSignals,
    blockingReasons: recommendedCondition === domain.conditionState ? ["La condición actual ya coincide con la evaluación."] : [],
  };
}
