import { CommandType, DomainProgressionState, EventType } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import { assert, equal, test } from "./test-utils.js";

let eventCommandSequence = 0;

function command(type, payload) {
  eventCommandSequence += 1;
  return {
    id: `event-command-${eventCommandSequence}`,
    type,
    payload,
    actor: "TEST",
    requestedAt: "2026-07-23T00:00:00.000Z",
  };
}

function createEventEngine() {
  const state = createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" });
  state.domains.find((domain) => domain.id === "vida").progressionState = DomainProgressionState.LOCKED;
  return new WorldEngine(state, { clock: () => "2026-07-23T00:00:01.000Z" });
}

test("una transición válida agrega exactamente un evento principal", () => {
  const engine = createEventEngine();
  const result = engine.dispatch(command(CommandType.MAKE_DOMAIN_AVAILABLE, { domainId: "vida" }));
  equal(result.events.length, 1);
  equal(engine.getSnapshot().eventLog.length, 1);
  equal(result.events[0].type, EventType.DOMAIN_AVAILABLE);
});

test("un evento contiene el contrato obligatorio", () => {
  const engine = createEventEngine();
  const result = engine.dispatch(command(CommandType.MAKE_DOMAIN_AVAILABLE, { domainId: "vida" }));
  const event = result.events[0];
  assert(typeof event.id === "string" && event.id.length > 0);
  equal(event.actor, "TEST");
  equal(event.source, "WORLD_ENGINE");
  equal(event.metadata.schemaVersion, "1.0.0");
  assert(!Number.isNaN(Date.parse(event.timestamp)));
});

test("un comando rechazado no agrega eventos", () => {
  const engine = createEventEngine();
  const result = engine.dispatch(command(CommandType.ACTIVATE_DOMAIN, { domainId: "vida" }));
  assert(!result.success);
  equal(engine.getSnapshot().eventLog.length, 0);
});

test("los eventos conservan orden de inserción e ids únicos", () => {
  const engine = createEventEngine();
  engine.dispatch(command(CommandType.MAKE_DOMAIN_AVAILABLE, { domainId: "vida" }));
  engine.dispatch(command(CommandType.ACTIVATE_DOMAIN, { domainId: "vida" }));
  const events = engine.getSnapshot().eventLog;
  equal(events.length, 2);
  equal(events[0].id, "event-00000001");
  equal(events[1].id, "event-00000002");
});
