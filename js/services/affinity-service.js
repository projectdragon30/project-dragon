function clampModifier(value) {
  return Math.min(Math.max(value, -0.5), 0.5);
}

export function evaluateDomainAffinities(state, targetDomainId) {
  const active = state.affinities.filter((affinity) => affinity.active);
  const incoming = active.filter((affinity) => affinity.targetDomainId === targetDomainId);
  const outgoing = active.filter((affinity) => affinity.sourceDomainId === targetDomainId);
  const modifiers = ["resilienceModifier", "recoveryModifier", "consistencyModifier"].reduce((result, key) => {
    result[key] = clampModifier(incoming.reduce((sum, affinity) => sum + (affinity.effects[key] ?? 0), 0));
    return result;
  }, {});
  return {
    targetDomainId,
    incoming,
    outgoing,
    modifiers,
    explanations: incoming.map((affinity) => `${affinity.id} aporta modificadores configurados.`),
  };
}
