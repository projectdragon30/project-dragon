export function deriveDomainTotalXP(state, domainId) {
  return state.xpTransactions
    .filter((transaction) => transaction.domainId === domainId)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function deriveTierXP(state, domainTierId) {
  return state.xpTransactions
    .filter((transaction) => transaction.domainTierId === domainTierId)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function synchronizeXPCaches(state) {
  state.domains.forEach((domain) => {
    domain.totalXP = deriveDomainTotalXP(state, domain.id);
  });
  state.domainTiers.forEach((tier) => {
    tier.tierXP = deriveTierXP(state, tier.id);
  });
}

export function grantXP(state, input) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { granted: false, error: { code: "INVALID_XP_TRANSACTION", message: "La XP debe ser positiva." } };
  }
  const domain = state.domains.find((candidate) => candidate.id === input.domainId);
  const tier = state.domainTiers.find((candidate) => candidate.id === input.domainTierId);
  if (!domain || !tier || tier.domainId !== domain.id) {
    return { granted: false, error: { code: "INVALID_XP_TRANSACTION", message: "Domain y Tier de XP no son válidos." } };
  }
  const id = `xp-${input.rewardTransactionId}`;
  const existing = state.xpTransactions.find((transaction) => transaction.id === id);
  if (existing) return { granted: false, transaction: existing };
  const transaction = {
    id,
    domainId: domain.id,
    domainTierId: tier.id,
    amount: input.amount,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    rewardTransactionId: input.rewardTransactionId,
    commandId: input.commandId,
    createdAt: input.createdAt,
  };
  state.xpTransactions.push(transaction);
  synchronizeXPCaches(state);
  return { granted: true, transaction };
}
