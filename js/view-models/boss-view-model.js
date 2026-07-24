import { selectBossAvailability } from "../selectors/world-selectors.js";

export function createBossViewModel(state, bossId) {
  const boss = state.bosses.find((item) => item.id === bossId);
  if (!boss) return null;
  const evaluation = selectBossAvailability(state, bossId);
  const checks = evaluation?.checks ?? [];
  return {
    id: boss.id,
    title: boss.name,
    status: boss.status,
    available: evaluation?.available ?? false,
    requirementProgress: checks.length ? checks.filter((item) => item.satisfied).length / checks.length : 0,
    challenged: boss.status === "CHALLENGED",
    defeated: boss.status === "DEFEATED",
    statusLabel: boss.status.replaceAll("_", " ").toLowerCase(),
    ariaLabel: `${boss.name}. Estado ${boss.status.replaceAll("_", " ")}.`,
  };
}
