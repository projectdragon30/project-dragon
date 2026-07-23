import {
  CommandType,
  DomainConditionState,
  DomainProgressionState,
  EventType,
} from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import { assert, equal, test } from "./test-utils.js";

let domainCommandSequence = 0;

function command(type, payload) {
  domainCommandSequence += 1;
  return {
    id: `domain-command-${domainCommandSequence}`,
    type,
    payload,
    actor: "TEST",
    requestedAt: "2026-07-23T00:00:00.000Z",
  };
}

function engineWithDomain(overrides = {}) {
  const state = createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" });
  Object.assign(state.domains.find((domain) => domain.id === "vida"), overrides);
  return new WorldEngine(state, { clock: () => "2026-07-23T00:00:01.000Z" });
}

test("permite LOCKED → AVAILABLE", () => {
  const engine = engineWithDomain({ progressionState: DomainProgressionState.LOCKED });
  const result = engine.dispatch(command(CommandType.MAKE_DOMAIN_AVAILABLE, { domainId: "vida" }));
  assert(result.success);
  equal(engine.getSnapshot().domains.find((domain) => domain.id === "vida").progressionState, DomainProgressionState.AVAILABLE);
  equal(result.events[0].type, EventType.DOMAIN_AVAILABLE);
});

test("permite AVAILABLE → ACTIVE", () => {
  const engine = engineWithDomain({ progressionState: DomainProgressionState.AVAILABLE });
  const result = engine.dispatch(command(CommandType.ACTIVATE_DOMAIN, { domainId: "vida" }));
  assert(result.success);
  equal(engine.getSnapshot().domains.find((domain) => domain.id === "vida").progressionState, DomainProgressionState.ACTIVE);
});

test("rechaza LOCKED → ACTIVE", () => {
  const engine = engineWithDomain({ progressionState: DomainProgressionState.LOCKED });
  const result = engine.dispatch(command(CommandType.ACTIVATE_DOMAIN, { domainId: "vida" }));
  assert(!result.success);
  equal(result.errors[0].code, "DOMAIN_NOT_AVAILABLE");
});

test("rechaza MASTERED → ACTIVE", () => {
  const engine = engineWithDomain({ progressionState: DomainProgressionState.MASTERED });
  const result = engine.dispatch(command(CommandType.ACTIVATE_DOMAIN, { domainId: "vida" }));
  assert(!result.success);
});

test("permite STABLE → STRAINED", () => {
  const engine = engineWithDomain({ conditionState: DomainConditionState.STABLE });
  const result = engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "vida",
    conditionState: DomainConditionState.STRAINED,
  }));
  assert(result.success);
  equal(result.events[0].type, EventType.DOMAIN_STRAINED);
});

test("rechaza STABLE → CORRUPTED sin excepcionalidad y causa", () => {
  const engine = engineWithDomain({ conditionState: DomainConditionState.STABLE });
  const result = engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "vida",
    conditionState: DomainConditionState.CORRUPTED,
  }));
  assert(!result.success);
  equal(result.errors[0].code, "INVALID_TRANSITION");
});

test("permite STABLE → CORRUPTED con exceptional y causa", () => {
  const engine = engineWithDomain({ conditionState: DomainConditionState.STABLE });
  const result = engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "vida",
    conditionState: DomainConditionState.CORRUPTED,
    exceptional: true,
    cause: "TEST",
  }));
  assert(result.success);
  equal(result.events[0].type, EventType.DOMAIN_CORRUPTED);
});

test("rechaza CORRUPTED → STABLE", () => {
  const engine = engineWithDomain({ conditionState: DomainConditionState.CORRUPTED });
  const result = engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "vida",
    conditionState: DomainConditionState.STABLE,
  }));
  assert(!result.success);
});

test("permite CORRUPTED → RECOVERING solo con START_DOMAIN_RECOVERY", () => {
  const engine = engineWithDomain({ conditionState: DomainConditionState.CORRUPTED });
  const rejected = engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "vida",
    conditionState: DomainConditionState.RECOVERING,
  }));
  assert(!rejected.success);
  const accepted = engine.dispatch(command(CommandType.START_DOMAIN_RECOVERY, { domainId: "vida" }));
  assert(accepted.success);
  equal(accepted.events[0].type, EventType.DOMAIN_RECOVERY_STARTED);
});

test("permite RECOVERING → STABLE", () => {
  const engine = engineWithDomain({ conditionState: DomainConditionState.RECOVERING });
  const result = engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "vida",
    conditionState: DomainConditionState.STABLE,
  }));
  assert(result.success);
  equal(result.events[0].type, EventType.DOMAIN_RESTORED);
});

test("permite RECOVERING → CORRUPTED", () => {
  const engine = engineWithDomain({ conditionState: DomainConditionState.RECOVERING });
  const result = engine.dispatch(command(CommandType.SET_DOMAIN_CONDITION, {
    domainId: "vida",
    conditionState: DomainConditionState.CORRUPTED,
  }));
  assert(result.success);
  equal(result.events[0].type, EventType.DOMAIN_RECOVERY_INTERRUPTED);
});
