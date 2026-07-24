import {
  CommandType,
  DomainConditionState,
  MasteryStatus,
} from "../js/constants/game-enums.js";
import { evaluateMasteryEligibility } from "../js/services/mastery-service.js";
import { assert, equal, test } from "./test-utils.js";
import {
  challengeAndDefeatBoss,
  command,
  completeCoreMission,
  completeDemoMilestone,
  createPhase5Engine,
} from "./phase5-test-helpers.js";

const tierId = "disciplina-tier-1";

test("XP insuficiente bloquea elegibilidad con razones comprensibles", () => {
  const evaluation = evaluateMasteryEligibility(createPhase5Engine().getSnapshot(), tierId);
  assert(!evaluation.eligible);
  assert(evaluation.blockingReasons.some((reason) => reason.includes("XP")));
});

test("XP suficiente sin progreso ni requisitos no concede maestría", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  const evaluation = engine.dispatch(command(CommandType.EVALUATE_DOMAIN_MASTERY, { domainTierId: tierId }));
  assert(evaluation.success);
  assert(!evaluation.data.eligible);
  equal(engine.getSnapshot().domainTiers.find((tier) => tier.id === tierId).masteryStatus, MasteryStatus.NOT_ELIGIBLE);
});

test("CORRUPTED bloquea elegibilidad aunque los demás requisitos se cumplan", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  completeDemoMilestone(engine);
  challengeAndDefeatBoss(engine);
  engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "disciplina", conditionState: DomainConditionState.CORRUPTED, exceptional: true, cause: "TEST",
  }));
  assert(!engine.select(evaluateMasteryEligibility, tierId).eligible);
});

test("cumplir todos los requisitos permite solicitar y conceder maestría", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  completeDemoMilestone(engine);
  challengeAndDefeatBoss(engine);
  const evaluated = engine.dispatch(command(CommandType.EVALUATE_DOMAIN_MASTERY, { domainTierId: tierId }));
  assert(evaluated.data.eligible);
  equal(engine.dispatch(command(CommandType.REQUEST_DOMAIN_MASTERY, { domainTierId: tierId })).data.masteryStatus, MasteryStatus.IN_REVIEW);
  const granted = engine.dispatch(command(CommandType.GRANT_DOMAIN_MASTERY, { domainTierId: tierId }));
  assert(granted.success);
  equal(granted.events.map((event) => event.type).join(","), "MASTERY_GRANTED,DOMAIN_TIER_MASTERED,DOMAIN_MASTERED,LEGACY_CONTRIBUTION_RECORDED");
});

test("GRANT reevalúa requisitos y un rechazo no muta el estado", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  completeDemoMilestone(engine);
  challengeAndDefeatBoss(engine);
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_MASTERY, { domainTierId: tierId }));
  engine.dispatch(command(CommandType.REQUEST_DOMAIN_MASTERY, { domainTierId: tierId }));
  engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "disciplina", conditionState: DomainConditionState.CORRUPTED, exceptional: true, cause: "TEST",
  }));
  const before = engine.getSnapshot();
  const result = engine.dispatch(command(CommandType.GRANT_DOMAIN_MASTERY, { domainTierId: tierId }));
  assert(!result.success);
  equal(JSON.stringify(engine.getSnapshot()), JSON.stringify(before));
});

test("maestría concedida es irreversible ante corrupción y reevaluación", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  completeDemoMilestone(engine);
  challengeAndDefeatBoss(engine);
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_MASTERY, { domainTierId: tierId }));
  engine.dispatch(command(CommandType.REQUEST_DOMAIN_MASTERY, { domainTierId: tierId }));
  engine.dispatch(command(CommandType.GRANT_DOMAIN_MASTERY, { domainTierId: tierId }));
  engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "disciplina", conditionState: DomainConditionState.CORRUPTED, exceptional: true, cause: "TEST",
  }));
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_MASTERY, { domainTierId: tierId }));
  equal(engine.getSnapshot().domainTiers.find((tier) => tier.id === tierId).masteryStatus, MasteryStatus.MASTERED);
});

test("REJECT_DOMAIN_MASTERY exige razón y conserva XP", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  completeDemoMilestone(engine);
  challengeAndDefeatBoss(engine);
  engine.dispatch(command(CommandType.EVALUATE_DOMAIN_MASTERY, { domainTierId: tierId }));
  engine.dispatch(command(CommandType.REQUEST_DOMAIN_MASTERY, { domainTierId: tierId }));
  const xpBefore = engine.getSnapshot().xpTransactions;
  const rejected = engine.dispatch(command(CommandType.REJECT_DOMAIN_MASTERY, { domainTierId: tierId, reason: "Revisión técnica" }));
  assert(rejected.success);
  equal(JSON.stringify(engine.getSnapshot().xpTransactions), JSON.stringify(xpBefore));
});
