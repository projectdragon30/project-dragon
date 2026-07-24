import { AffinityStrength, isEnumValue } from "../constants/game-enums.js";

export function validateAffinity(affinity) {
  const valid = affinity && affinity.sourceDomainId !== affinity.targetDomainId &&
    isEnumValue(AffinityStrength, affinity.strength) && affinity.effects && typeof affinity.active === "boolean";
  return valid
    ? { valid: true, errors: [] }
    : { valid: false, errors: [{ code: "INVALID_AFFINITY", message: "Afinidad inválida.", details: {} }] };
}
