export const LEGACY_CONTRIBUTION_VALUES_DEMO = Object.freeze({
  MISSION_COMPLETED: 1,
  CORE_MISSION_COMPLETED: 2,
  MASTERY_MISSION_COMPLETED: 2,
  MILESTONE_COMPLETED: 2,
  DOMAIN_TIER_MASTERED: 3,
  BOSS_DEFEATED: 3,
  RESTORATION_COMPLETED: 2,
});

export function recordLegacyContribution(state, input) {
  const id = `legacy-${input.sourceType}-${input.sourceId}-${input.contributionType}`;
  const existing = state.contributions.find((item) => item.id === id);
  if (existing) return { recorded: false, contribution: existing };
  const amount = LEGACY_CONTRIBUTION_VALUES_DEMO[input.contributionType];
  if (!Number.isFinite(amount) || amount <= 0) return { recorded: false, error: "INVALID_CONTRIBUTION" };
  const contribution = {
    id,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    domainId: input.domainId,
    contributionType: input.contributionType,
    amount,
    createdAt: input.createdAt,
    commandId: input.commandId,
    metadata: { contentStatus: "DEMO", notes: "PLACEHOLDER: valor técnico provisional." },
  };
  state.contributions.push(contribution);
  return { recorded: true, contribution };
}

export function legacyContributionEvent(result) {
  return result.recorded
    ? { type: "LEGACY_CONTRIBUTION_RECORDED", payload: { contributionId: result.contribution.id, amount: result.contribution.amount } }
    : null;
}
