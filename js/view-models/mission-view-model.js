import {
  selectMissionCompletionEligibility,
  selectMissionProgress,
  selectObjectiveProgress,
} from "../selectors/world-selectors.js";
import { UI_LABELS } from "../presentation/ui-labels.js";

function controlType(objective) {
  return {
    BOOLEAN: "checkbox", COUNT: "number", STREAK: "number", THRESHOLD: "number",
    CHECKLIST: "checklist", EVIDENCE: "evidence", DECISION: "text",
  }[objective.type];
}

export function createMissionViewModel(state, definition) {
  const availability = state.system.missionAvailability[definition.id];
  const instance = [...state.missionInstances].reverse().find((item) => item.definitionId === definition.id) ?? null;
  const progress = instance ? selectMissionProgress(state, instance.id) : 0;
  const eligibility = instance ? selectMissionCompletionEligibility(state, instance.id) : { eligible: false };
  return {
    id: definition.id,
    instanceId: instance?.id ?? null,
    title: definition.title,
    description: definition.metadata?.notes ?? "",
    type: definition.type,
    status: instance?.status ?? availability,
    statusLabel: UI_LABELS.mission[instance?.status ?? availability],
    availability,
    progress,
    progressPercent: Math.round(progress * 100),
    objectives: definition.objectives.map((objective) => ({
      id: objective.id,
      label: objective.description,
      type: objective.type,
      currentValue: instance?.objectiveProgress?.[objective.id] ?? null,
      target: objective.target ?? null,
      progress: instance ? selectObjectiveProgress(state, instance.id, objective.id) : 0,
      completed: instance ? selectObjectiveProgress(state, instance.id, objective.id) === 1 : false,
      requiresEvidence: objective.type === "EVIDENCE",
      controlType: controlType(objective),
    })),
    canStart: availability === "AVAILABLE" && !instance,
    canUpdate: instance?.status === "ACTIVE",
    canComplete: instance?.status === "ACTIVE" && eligibility?.eligible === true,
    rewardSummary: definition.rewards?.some((reward) => reward.rewardType === "XP")
      ? `${definition.rewards.reduce((sum, reward) => sum + (reward.amount ?? 0), 0)} XP · DEMO`
      : "Sin recompensa",
    isDemo: definition.contentStatus === "DEMO" || definition.metadata?.contentStatus === "DEMO",
  };
}
