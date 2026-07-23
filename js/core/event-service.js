import { cloneSerializable } from "./state-snapshot.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export class EventService {
  constructor(options = {}) {
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  createEvent(state, eventInput, command, timestamp = this.clock()) {
    state.system.lastEventSequence += 1;
    const sequence = state.system.lastEventSequence;
    const event = {
      id: `event-${String(sequence).padStart(8, "0")}`,
      type: eventInput.type,
      timestamp,
      actor: cloneSerializable(command.actor),
      source: "WORLD_ENGINE",
      payload: cloneSerializable(eventInput.payload ?? {}),
      metadata: {
        schemaVersion: state.schemaVersion,
        commandId: command.id,
      },
    };
    return deepFreeze(event);
  }
}
