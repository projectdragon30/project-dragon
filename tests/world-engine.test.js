import { CommandType, DomainProgressionState } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import { assert, deepEqual, equal, test } from "./test-utils.js";
import { collectForbiddenValues } from "./test-utils.js";

let engineCommandSequence = 0;

function command(type, payload = {}) {
  engineCommandSequence += 1;
  return {
    id: `engine-command-${engineCommandSequence}`,
    type,
    payload,
    actor: "TEST",
    requestedAt: "2026-07-23T00:00:00.000Z",
  };
}

function createEngine() {
  const state = createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" });
  state.domains.find((domain) => domain.id === "vida").progressionState = DomainProgressionState.LOCKED;
  return new WorldEngine(state, { clock: () => "2026-07-23T00:00:01.000Z" });
}

test("un comando válido modifica el estado", () => {
  const engine = createEngine();
  const result = engine.dispatch(command(CommandType.MAKE_DOMAIN_AVAILABLE, { domainId: "vida" }));
  assert(result.success);
  equal(engine.getSnapshot().domains.find((domain) => domain.id === "vida").progressionState, DomainProgressionState.AVAILABLE);
});

test("un comando rechazado no modifica el estado", () => {
  const engine = createEngine();
  const before = engine.getSnapshot();
  const result = engine.dispatch(command(CommandType.ACTIVATE_DOMAIN, { domainId: "vida" }));
  assert(!result.success);
  deepEqual(engine.getSnapshot(), before);
});

test("modificar un snapshot externo no modifica el estado interno", () => {
  const engine = createEngine();
  const snapshot = engine.getSnapshot();
  snapshot.domains[0].progressionState = DomainProgressionState.MASTERED;
  assert(engine.getSnapshot().domains[0].progressionState !== DomainProgressionState.MASTERED);
});

test("un suscriptor recibe cambios válidos", () => {
  const engine = createEngine();
  let notifications = 0;
  engine.subscribe((snapshot, events) => {
    notifications += 1;
    equal(snapshot.eventLog.length, 1);
    equal(events.length, 1);
  });
  engine.dispatch(command(CommandType.MAKE_DOMAIN_AVAILABLE, { domainId: "vida" }));
  equal(notifications, 1);
});

test("un suscriptor no recibe comandos rechazados", () => {
  const engine = createEngine();
  let notifications = 0;
  engine.subscribe(() => { notifications += 1; });
  engine.dispatch(command(CommandType.ACTIVATE_DOMAIN, { domainId: "vida" }));
  equal(notifications, 0);
});

test("unsubscribe detiene notificaciones", () => {
  const engine = createEngine();
  let notifications = 0;
  const unsubscribe = engine.subscribe(() => { notifications += 1; });
  unsubscribe();
  engine.dispatch(command(CommandType.MAKE_DOMAIN_AVAILABLE, { domainId: "vida" }));
  equal(notifications, 0);
});

test("un listener que lanza error no rompe el motor ni otros listeners", () => {
  const engine = createEngine();
  let safeListenerCalls = 0;
  engine.subscribe(() => { throw new Error("listener failure"); });
  engine.subscribe(() => { safeListenerCalls += 1; });
  const result = engine.dispatch(command(CommandType.MAKE_DOMAIN_AVAILABLE, { domainId: "vida" }));
  assert(result.success);
  equal(safeListenerCalls, 1);
});

test("un comando desconocido devuelve INVALID_COMMAND", () => {
  const engine = createEngine();
  const result = engine.dispatch(command("UNKNOWN_COMMAND"));
  assert(!result.success);
  equal(result.errors[0].code, "INVALID_COMMAND");
});

test("un comando con payload inválido devuelve INVALID_PAYLOAD", () => {
  const engine = createEngine();
  const malformed = command(CommandType.MAKE_DOMAIN_AVAILABLE);
  malformed.payload = null;
  const result = engine.dispatch(malformed);
  assert(!result.success);
  equal(result.errors[0].code, "INVALID_PAYLOAD");
});

test("el estado posterior a transiciones sigue siendo JSON serializable y no contiene Date ni funciones", () => {
  const engine = createEngine();
  engine.dispatch(command(CommandType.MAKE_DOMAIN_AVAILABLE, { domainId: "vida" }));
  const snapshot = engine.getSnapshot();
  JSON.stringify(snapshot);
  deepEqual(collectForbiddenValues(snapshot), []);
});
