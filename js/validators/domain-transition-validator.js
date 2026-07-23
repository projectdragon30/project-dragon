import { DomainConditionState, DomainProgressionState } from "../constants/game-enums.js";

function accepted() {
  return { valid: true, errors: [] };
}

function rejected(code, message, details) {
  return { valid: false, errors: [{ code, message, details }] };
}

export function validateDomainAvailabilityTransition(domain) {
  if (domain.progressionState !== DomainProgressionState.LOCKED) {
    return rejected(
      "INVALID_TRANSITION",
      "Solo un Dominio LOCKED puede pasar a AVAILABLE.",
      { domainId: domain.id, from: domain.progressionState, to: DomainProgressionState.AVAILABLE },
    );
  }
  return accepted();
}

export function validateDomainActivationTransition(domain) {
  if (domain.progressionState !== DomainProgressionState.AVAILABLE) {
    return rejected(
      "DOMAIN_NOT_AVAILABLE",
      "Solo un Dominio AVAILABLE puede activarse.",
      { domainId: domain.id, from: domain.progressionState, to: DomainProgressionState.ACTIVE },
    );
  }
  return accepted();
}

export function validateDomainConditionTransition(domain, targetCondition, context = {}) {
  const from = domain.conditionState;
  const transition = `${from}->${targetCondition}`;

  if (targetCondition === DomainConditionState.RECOVERING) {
    return rejected(
      "INVALID_TRANSITION",
      "RECOVERING solo puede iniciarse mediante START_DOMAIN_RECOVERY.",
      { domainId: domain.id, from, to: targetCondition },
    );
  }

  const allowed = new Set([
    `${DomainConditionState.STABLE}->${DomainConditionState.STRAINED}`,
    `${DomainConditionState.STRAINED}->${DomainConditionState.STABLE}`,
    `${DomainConditionState.STRAINED}->${DomainConditionState.CORRUPTED}`,
    `${DomainConditionState.RECOVERING}->${DomainConditionState.STABLE}`,
    `${DomainConditionState.RECOVERING}->${DomainConditionState.CORRUPTED}`,
  ]);

  if (
    transition === `${DomainConditionState.STABLE}->${DomainConditionState.CORRUPTED}` &&
    context.exceptional === true &&
    typeof context.cause === "string" &&
    context.cause.trim().length > 0
  ) {
    return accepted();
  }

  if (!allowed.has(transition)) {
    return rejected(
      "INVALID_TRANSITION",
      `Transición de condición no permitida: ${transition}.`,
      { domainId: domain.id, from, to: targetCondition },
    );
  }

  return accepted();
}

export function validateDomainRecoveryStart(domain) {
  if (domain.conditionState !== DomainConditionState.CORRUPTED) {
    return rejected(
      "INVALID_TRANSITION",
      "START_DOMAIN_RECOVERY requiere un Dominio CORRUPTED.",
      { domainId: domain.id, from: domain.conditionState, to: DomainConditionState.RECOVERING },
    );
  }
  return accepted();
}
