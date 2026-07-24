import {
  selectDomain,
  selectDomainTierCompletion,
  selectDomainTierProgress,
  selectDomainTotalXP,
  selectTierXP,
} from "../selectors/world-selectors.js";
import { UI_LABELS } from "../presentation/ui-labels.js";
import { formatPercent, formatXP } from "../presentation/ui-formatters.js";

export function createDomainViewModel(state, region) {
  const domain = selectDomain(state, region.domainId);
  if (!domain) return null;
  const tier = state.domainTiers.find((item) => item.domainId === domain.id) ?? null;
  const progress = tier ? selectDomainTierProgress(state, tier.id) : 0;
  const completion = tier ? selectDomainTierCompletion(state, tier.id) : 0;
  const progression = domain.progressionState.toLowerCase();
  const condition = domain.conditionState.toLowerCase();
  const conditionPriority = domain.conditionState !== "STABLE";
  return {
    id: domain.id,
    regionId: region.id,
    title: region.title,
    subtitle: region.subtitle,
    progressionState: domain.progressionState,
    conditionState: domain.conditionState,
    masteryStatus: domain.masteryStatus,
    totalXP: selectDomainTotalXP(state, domain.id),
    tierXP: tier ? selectTierXP(state, tier.id) : 0,
    tierId: tier?.id ?? null,
    progress,
    completion,
    isFuture: domain.progressionState === "FUTURE",
    isLocked: domain.progressionState === "LOCKED",
    isAvailable: domain.progressionState === "AVAILABLE",
    isActive: domain.progressionState === "ACTIVE",
    isMastered: domain.progressionState === "MASTERED",
    isStrained: domain.conditionState === "STRAINED",
    isCorrupted: domain.conditionState === "CORRUPTED",
    isRecovering: domain.conditionState === "RECOVERING",
    visualState: conditionPriority ? `${progression} ${condition}` : progression,
    statusLabel: UI_LABELS.progression[domain.progressionState],
    conditionLabel: UI_LABELS.condition[domain.conditionState],
    masteryLabel: UI_LABELS.mastery[domain.masteryStatus],
    progressLabel: formatPercent(progress),
    completionLabel: formatPercent(completion),
    xpLabel: formatXP(selectDomainTotalXP(state, domain.id)),
    tierXPLabel: formatXP(tier ? selectTierXP(state, tier.id) : 0),
    ariaLabel: `${region.title}. ${UI_LABELS.progression[domain.progressionState]}. Condición ${UI_LABELS.condition[domain.conditionState]}.`,
  };
}
