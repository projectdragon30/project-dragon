import { ConditionSignalSeverity, ConditionSignalType, isEnumValue } from "../constants/game-enums.js";

export function validateConditionSignal(state, input) {
  const valid = input && state.domains.some((domain) => domain.id === input.domainId) &&
    isEnumValue(ConditionSignalType, input.type) && isEnumValue(ConditionSignalSeverity, input.severity) &&
    typeof input.sourceType === "string" && input.sourceType.trim() &&
    typeof input.sourceId === "string" && input.sourceId.trim();
  return valid
    ? { valid: true, errors: [] }
    : { valid: false, errors: [{ code: "INVALID_CONDITION_SIGNAL", message: "Señal de condición inválida.", details: {} }] };
}
