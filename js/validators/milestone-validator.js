import { MilestoneStatus } from "../constants/game-enums.js";

export function validateMilestoneCompletion(milestone) {
  return milestone.status === MilestoneStatus.AVAILABLE
    ? { valid: true, errors: [] }
    : { valid: false, errors: [{ code: "MILESTONE_NOT_AVAILABLE", message: "El hito debe estar AVAILABLE.", details: { status: milestone.status } }] };
}
