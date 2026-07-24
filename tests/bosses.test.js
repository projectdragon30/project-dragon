import { BossStatus, CommandType } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import { assert, equal, test } from "./test-utils.js";
import {
  challengeAndDefeatBoss,
  command,
  completeCoreMission,
  createPhase5Engine,
} from "./phase5-test-helpers.js";

const bossId = "piloto-automatico";

test("HIDDEN pasa a REVEALED sin saltos", () => {
  const state = createInitialWorldState();
  state.bosses[0].status = BossStatus.HIDDEN;
  const engine = new WorldEngine(state);
  const result = engine.dispatch(command(CommandType.REVEAL_BOSS, { bossId }));
  assert(result.success);
  equal(engine.getSnapshot().bosses[0].status, BossStatus.REVEALED);
});

test("REVEALED no puede desafiarse sin requisitos", () => {
  const engine = createPhase5Engine();
  const result = engine.dispatch(command(CommandType.CHALLENGE_BOSS, { bossId }));
  assert(!result.success);
  equal(result.errors[0].code, "BOSS_NOT_AVAILABLE");
});

test("cumplir requisitos produce CHALLENGE_AVAILABLE y permite CHALLENGED", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  const evaluated = engine.dispatch(command(CommandType.EVALUATE_BOSS_AVAILABILITY, { bossId }));
  assert(evaluated.success);
  equal(engine.getSnapshot().bosses[0].status, BossStatus.CHALLENGE_AVAILABLE);
  const challenged = engine.dispatch(command(CommandType.CHALLENGE_BOSS, { bossId }));
  assert(challenged.success);
  equal(engine.getSnapshot().system.missionAvailability["piloto-automatico-desafio-tecnico-demo"], "AVAILABLE");
});

test("jefe no puede derrotarse con desafío pendiente ni únicamente con XP", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  engine.dispatch(command(CommandType.EVALUATE_BOSS_AVAILABILITY, { bossId }));
  engine.dispatch(command(CommandType.CHALLENGE_BOSS, { bossId }));
  const result = engine.dispatch(command(CommandType.DEFEAT_BOSS, { bossId }));
  assert(!result.success);
  equal(result.errors[0].code, "BOSS_REQUIREMENTS_NOT_MET");
});

test("jefe puede derrotarse tras completar su desafío, sin conceder XP", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  const xpBefore = engine.getSnapshot().xpTransactions.length;
  const result = challengeAndDefeatBoss(engine);
  assert(result.success);
  equal(engine.getSnapshot().bosses[0].status, BossStatus.DEFEATED);
  equal(engine.getSnapshot().xpTransactions.length, xpBefore);
  equal(result.events.map((event) => event.type).join(","), "BOSS_DEFEATED,DOMAIN_PROGRESS_UPDATED,WORLD_LEVEL_PROGRESS_UPDATED");
});

test("DEFEATED no puede retroceder ni derrotarse otra vez", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  challengeAndDefeatBoss(engine);
  const result = engine.dispatch(command(CommandType.DEFEAT_BOSS, { bossId }));
  assert(!result.success);
  equal(engine.getSnapshot().bosses[0].status, BossStatus.DEFEATED);
});
