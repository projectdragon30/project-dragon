import { CommandType, isEnumValue } from "../constants/game-enums.js";
import { assertValidWorldState } from "../validators/world-state-validator.js";
import { CommandHandler } from "./command-handler.js";
import { EventService } from "./event-service.js";
import { cloneSerializable, createStateSnapshot } from "./state-snapshot.js";
import { createInitialWorldState } from "./state-factory.js";

function rejected(commandId, errors) {
  return {
    success: false,
    commandId: commandId ?? null,
    data: null,
    events: [],
    errors,
  };
}

function validateCommandEnvelope(command) {
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    return [{ code: "INVALID_COMMAND", message: "El comando debe ser un objeto.", details: {} }];
  }
  if (typeof command.id !== "string" || !command.id.trim()) {
    return [{ code: "INVALID_COMMAND", message: "command.id es obligatorio.", details: { field: "id" } }];
  }
  if (!isEnumValue(CommandType, command.type)) {
    return [{ code: "INVALID_COMMAND", message: `Comando no soportado: ${String(command.type)}.`, details: { type: command.type } }];
  }
  if (!command.payload || typeof command.payload !== "object" || Array.isArray(command.payload)) {
    return [{ code: "INVALID_PAYLOAD", message: "command.payload debe ser un objeto.", details: { field: "payload" } }];
  }
  if (command.actor === undefined || command.actor === null) {
    return [{ code: "INVALID_COMMAND", message: "command.actor es obligatorio.", details: { field: "actor" } }];
  }
  if (typeof command.requestedAt !== "string" || Number.isNaN(Date.parse(command.requestedAt))) {
    return [{ code: "INVALID_COMMAND", message: "command.requestedAt debe ser una fecha ISO.", details: { field: "requestedAt" } }];
  }
  return [];
}

export class WorldEngine {
  #state;
  #listeners = new Set();

  constructor(initialState, options = {}) {
    assertValidWorldState(initialState);
    this.#state = createStateSnapshot(initialState);
    this.commandHandler = options.commandHandler ?? new CommandHandler();
    this.eventService = options.eventService ?? new EventService({ clock: options.clock });
    this.persistenceService = options.persistenceService ?? null;
    this.stateFactory = options.stateFactory ?? createInitialWorldState;
    this.autosave = {
      enabled: false,
      saveAfterSuccessfulCommand: true,
      excludedCommandTypes: [],
      ...(options.autosave ?? {}),
    };
  }

  dispatch(command) {
    const envelopeErrors = validateCommandEnvelope(command);
    if (envelopeErrors.length > 0) return rejected(command?.id, envelopeErrors);

    const candidate = createStateSnapshot(this.#state);
    const transitionTimestamp = this.eventService.clock();
    const handled = this.commandHandler.handle(candidate, cloneSerializable(command), transitionTimestamp);
    if (!handled.success) return rejected(command.id, handled.errors);

    candidate.metadata.updatedAt = transitionTimestamp;
    const events = handled.events.map((eventInput) =>
      this.eventService.createEvent(candidate, eventInput, command, transitionTimestamp));
    candidate.eventLog.push(...events);

    try {
      assertValidWorldState(candidate);
    } catch (error) {
      return rejected(command.id, [
        {
          code: "INVALID_TRANSITION",
          message: "La transición produciría un World State inválido.",
          details: { validationErrors: error.errors ?? [] },
        },
      ]);
    }

    this.#state = candidate;
    const snapshot = this.getSnapshot();
    const publicEvents = cloneSerializable(events);
    this.#notify(snapshot, publicEvents);

    const result = {
      success: true,
      commandId: command.id,
      data: cloneSerializable(handled.data),
      events: publicEvents,
      errors: [],
    };
    if (this.persistenceService && this.autosave.enabled && this.autosave.saveAfterSuccessfulCommand &&
        !this.autosave.excludedCommandTypes.includes(command.type)) {
      const autosaveResult = this.persistenceService.save(this.getSnapshot());
      if (!autosaveResult.ok) result.autosaveError = cloneSerializable(autosaveResult.error);
    }
    return result;
  }

  execute(command) {
    return this.dispatch(command);
  }

  getSnapshot() {
    return createStateSnapshot(this.#state);
  }

  select(selector, ...args) {
    if (typeof selector !== "function") throw new TypeError("select requiere una función selector.");
    return cloneSerializable(selector(this.getSnapshot(), ...cloneSerializable(args)));
  }

  persistenceUnavailable() {
    return { ok: false, value: null, error: { code: "PERSISTENCE_NOT_CONFIGURED", message: "PersistenceService no fue configurado.", details: {} } };
  }

  save() {
    return this.persistenceService ? this.persistenceService.save(this.getSnapshot()) : this.persistenceUnavailable();
  }

  load() {
    if (!this.persistenceService) return this.persistenceUnavailable();
    const loaded = this.persistenceService.load();
    if (!loaded.ok) return loaded;
    try { assertValidWorldState(loaded.value); } catch (error) {
      return { ok: false, value: null, error: { code: "INVALID_WORLD_STATE", message: error.message, details: {} } };
    }
    this.#state = createStateSnapshot(loaded.value);
    return { ok: true, value: this.getSnapshot(), error: null };
  }

  hasSave() { return this.persistenceService ? { ok: true, value: this.persistenceService.hasSave(), error: null } : this.persistenceUnavailable(); }
  exportSave() { return this.persistenceService ? this.persistenceService.exportSave() : this.persistenceUnavailable(); }
  importSave(serialized) {
    if (!this.persistenceService) return this.persistenceUnavailable();
    const imported = this.persistenceService.importSave(serialized);
    if (!imported.ok) return imported;
    this.#state = createStateSnapshot(imported.value);
    return { ok: true, value: this.getSnapshot(), error: null };
  }
  createBackup() { return this.persistenceService ? this.persistenceService.createBackup() : this.persistenceUnavailable(); }
  restoreBackup() {
    if (!this.persistenceService) return this.persistenceUnavailable();
    const restored = this.persistenceService.restoreBackup();
    if (!restored.ok) return restored;
    this.#state = createStateSnapshot(restored.value);
    return { ok: true, value: this.getSnapshot(), error: null };
  }
  resetWorld(options = {}) {
    if (options.confirmation !== "RESET_PROJECT_DRAGON") {
      return { ok: false, value: null, error: { code: "RESET_CONFIRMATION_REQUIRED", message: "Confirmación de reset incorrecta o ausente.", details: {} } };
    }
    const next = this.stateFactory({ createdAt: this.eventService.clock() });
    assertValidWorldState(next);
    this.#state = createStateSnapshot(next);
    return { ok: true, value: this.getSnapshot(), error: null };
  }

  subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("subscribe requiere una función listener.");
    }
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #notify(snapshot, events) {
    this.#listeners.forEach((listener) => {
      try {
        listener(createStateSnapshot(snapshot), cloneSerializable(events));
      } catch {
        // Un listener externo no puede interrumpir el motor ni a otros listeners.
      }
    });
  }
}
