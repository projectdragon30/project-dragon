export function validateContribution(contribution, state) {
  const valid = contribution && Number.isFinite(contribution.amount) && contribution.amount > 0 &&
    state.domains.some((domain) => domain.id === contribution.domainId);
  return valid
    ? { valid: true, errors: [] }
    : { valid: false, errors: [{ code: "INVALID_CONTRIBUTION", message: "Contribución inválida.", details: {} }] };
}
