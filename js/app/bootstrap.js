import { LocalStorageAdapter } from "../adapters/local-storage-adapter.js";
import { MemoryStorageAdapter } from "../adapters/memory-storage-adapter.js";
import { PersistenceService } from "../services/persistence-service.js";
import { createInitialWorldState } from "../core/state-factory.js";
import { WorldEngine } from "../core/world-engine.js";
import { CommandType } from "../constants/game-enums.js";
import { NotificationCenter } from "../ui/notification-center.js";
import { LoadingState } from "../ui/loading-state.js";
import { createApplication } from "./create-application.js";

const EXPOSE_ENGINE_FOR_DEVELOPMENT = false;

function availabilityCommand(engine) {
  const state = engine.getSnapshot();
  if (state.system.missionAvailability["reconocer-piloto-automatico-demo"] !== "HIDDEN") return null;
  return {
    id: `bootstrap-availability-${state.metadata.createdAt.replace(/[^0-9]/g, "")}`,
    type: CommandType.MAKE_MISSION_AVAILABLE,
    payload: { missionDefinitionId: "reconocer-piloto-automatico-demo" },
    actor: { type: "SYSTEM", id: "bootstrap" },
    requestedAt: new Date().toISOString(),
  };
}

export function prepareEngine({ engine, persistence, notifications, persistent = true }) {
  let recoveryMessage = null;
  if (persistence.hasSave()) {
    const loaded = engine.load();
    if (!loaded.ok) {
      const restored = engine.restoreBackup();
      recoveryMessage = restored.ok
        ? "Se recuperó la última copia de seguridad válida."
        : "La partida guardada no pudo recuperarse. Se inició una sesión nueva sin borrar los datos problemáticos.";
    }
  } else {
    const saved = engine.save();
    if (!saved.ok && persistent) notifications.show("warning", "No fue posible crear la partida local.", saved.error);
  }
  const command = availabilityCommand(engine);
  if (command) engine.execute(command);
  return { recoveryMessage };
}

export async function bootstrapApplication(options = {}) {
  const document = options.document ?? globalThis.document;
  const notifications = options.notifications ??
    new NotificationCenter(document.querySelector("#notification-center"));
  const loading = options.loading ?? new LoadingState(document.querySelector("#loading-state"));
  loading.setLoading(true);
  let adapter;
  let persistent = true;
  try {
    adapter = options.adapter ?? new LocalStorageAdapter(options.storage ?? globalThis.localStorage);
  } catch (error) {
    adapter = new MemoryStorageAdapter();
    persistent = false;
    notifications.show("warning", "El progreso funcionará durante esta sesión, pero no podrá guardarse localmente.", error);
  }
  const persistence = options.persistenceService ?? new PersistenceService(adapter);
  const engine = options.engine ?? new WorldEngine(createInitialWorldState(), {
    persistenceService: persistence,
    autosave: { enabled: true, saveAfterSuccessfulCommand: true, excludedCommandTypes: [] },
  });
  const { recoveryMessage } = prepareEngine({ engine, persistence, notifications, persistent });
  const app = createApplication({ engine, document, notifications });
  if (recoveryMessage) notifications.show("warning", recoveryMessage);
  loading.setLoading(false);
  if (EXPOSE_ENGINE_FOR_DEVELOPMENT) globalThis.__PROJECT_DRAGON_ENGINE__ = engine;
  return app;
}
