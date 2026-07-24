import { DomainConditionState, MasteryStatus } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { deriveDomainTotalXP, deriveTierXP, grantXP } from "../js/services/xp-service.js";
import { assert, equal, test } from "./test-utils.js";

function grantDemo(state, overrides = {}) {
  state.rewardTransactions.push({
    id: "reward-source",
    rewardDefinitionId: "demo",
    rewardType: "XP",
    sourceType: "MISSION",
    sourceId: "mission-instance",
    targetType: "DOMAIN_TIER",
    targetId: "disciplina-tier-1",
    value: 10,
    createdAt: "2026-07-23T00:00:01.000Z",
    commandId: "command",
    xpTransactionIds: [],
  });
  const result = grantXP(state, {
    amount: 10,
    domainId: "disciplina",
    domainTierId: "disciplina-tier-1",
    sourceType: "MISSION",
    sourceId: "mission-instance",
    rewardTransactionId: "reward-source",
    commandId: "command",
    createdAt: "2026-07-23T00:00:01.000Z",
    ...overrides,
  });
  if (result.transaction) state.rewardTransactions[0].xpTransactionIds = [result.transaction.id];
  return result;
}

test("XP se registra mediante transacción y sincroniza caches", () => {
  const state = createInitialWorldState();
  assert(grantDemo(state).granted);
  equal(deriveDomainTotalXP(state, "disciplina"), 10);
  equal(deriveTierXP(state, "disciplina-tier-1"), 10);
  equal(state.domains.find((item) => item.id === "disciplina").totalXP, 10);
  equal(state.domainTiers.find((item) => item.id === "disciplina-tier-1").tierXP, 10);
});

test("XP negativa se rechaza y no se registra", () => {
  const state = createInitialWorldState();
  const result = grantDemo(state, { amount: -1 });
  assert(!result.granted);
  equal(state.xpTransactions.length, 0);
});

test("la misma recompensa no duplica XP", () => {
  const state = createInitialWorldState();
  grantDemo(state);
  grantXP(state, {
    amount: 10, domainId: "disciplina", domainTierId: "disciplina-tier-1",
    sourceType: "MISSION", sourceId: "mission-instance", rewardTransactionId: "reward-source",
    commandId: "different-command", createdAt: "2026-07-23T00:00:02.000Z",
  });
  equal(state.xpTransactions.length, 1);
});

test("XP no concede maestría", () => {
  const state = createInitialWorldState();
  grantDemo(state);
  equal(state.domains.find((item) => item.id === "disciplina").masteryStatus, MasteryStatus.NOT_ELIGIBLE);
});

test("un Dominio CORRUPTED conserva toda su XP", () => {
  const state = createInitialWorldState();
  const domain = state.domains.find((item) => item.id === "disciplina");
  domain.conditionState = DomainConditionState.CORRUPTED;
  grantDemo(state);
  equal(deriveDomainTotalXP(state, domain.id), 10);
});
