import { BossStatus } from "../constants/game-enums.js";

export function validateBossTransition(boss, from, code) {
  return boss.status === from
    ? { valid: true, errors: [] }
    : { valid: false, errors: [{ code, message: `El jefe debe estar ${from}.`, details: { status: boss.status } }] };
}

export const BOSS_TRANSITIONS = Object.freeze({
  reveal: BossStatus.HIDDEN,
  challenge: BossStatus.CHALLENGE_AVAILABLE,
  defeat: BossStatus.CHALLENGED,
});
