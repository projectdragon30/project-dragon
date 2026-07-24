import { MasteryStatus } from "../constants/game-enums.js";

export function validateMasteryRequest(tier) {
  return tier.masteryStatus === MasteryStatus.ELIGIBLE
    ? { valid: true, errors: [] }
    : { valid: false, errors: [{ code: "MASTERY_NOT_ELIGIBLE", message: "El Tier no está ELIGIBLE.", details: { status: tier.masteryStatus } }] };
}

export function validateMasteryReview(tier) {
  return tier.masteryStatus === MasteryStatus.IN_REVIEW
    ? { valid: true, errors: [] }
    : { valid: false, errors: [{ code: tier.masteryStatus === MasteryStatus.MASTERED ? "MASTERY_ALREADY_GRANTED" : "MASTERY_NOT_IN_REVIEW", message: "El Tier no está IN_REVIEW.", details: { status: tier.masteryStatus } }] };
}
