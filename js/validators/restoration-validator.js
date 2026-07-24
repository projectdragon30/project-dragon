import { DomainConditionState } from "../constants/game-enums.js";

export function validateRestorationActivation(domain) {
  return domain && [DomainConditionState.STRAINED, DomainConditionState.CORRUPTED, DomainConditionState.RECOVERING].includes(domain.conditionState)
    ? { valid: true, errors: [] }
    : { valid: false, errors: [{ code: "RESTORATION_NOT_AVAILABLE", message: "La restauración no está disponible.", details: {} }] };
}
