import { CommandType, MissionStatus } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";
import {
  selectActiveMissions,
  selectAvailableMissions,
  selectDomain,
  selectDomainTier,
  selectMissionCompletionEligibility,
  selectMissionDefinition,
  selectMissionProgress,
  selectWorldLevel,
} from "../js/selectors/world-selectors.js";
import { assert, equal, test } from "./test-utils.js";

let sequence = 0;
const command = (type, payload) => ({
  id: `selector-command-${++sequence}`, type, payload, actor: "TEST", requestedAt: "2026-07-23T00:00:00.000Z",
});

test("selectores de entidad devuelven entidad o null consistentemente", () => {
  const state = createInitialWorldState();
  equal(selectWorldLevel(state, "awakening").id, "awakening");
  equal(selectDomain(state, "disciplina").id, "disciplina");
  equal(selectDomainTier(state, "disciplina-tier-1").domainId, "disciplina");
  equal(selectMissionDefinition(state, "missing"), null);
});

test("selectores filtran misiones disponibles y activas", () => {
  const state = createInitialWorldState();
  state.system.missionAvailability["reconocer-piloto-automatico-demo"] = MissionStatus.AVAILABLE;
  equal(selectAvailableMissions(state).length, 1);
  state.missionInstances.push({ id: "active", definitionId: "reconocer-piloto-automatico-demo", status: MissionStatus.ACTIVE });
  equal(selectActiveMissions(state).length, 1);
});

test("selectores derivados informan progreso y elegibilidad", () => {
  const state = createInitialWorldState();
  state.missionInstances.push({
    id: "active",
    definitionId: "reconocer-piloto-automatico-demo",
    status: MissionStatus.ACTIVE,
    objectiveProgress: {},
    evidenceEntries: [],
  });
  equal(selectMissionProgress(state, "active"), 0);
  assert(!selectMissionCompletionEligibility(state, "active").eligible);
});

test("engine.select no expone la referencia interna", () => {
  const engine = new WorldEngine(createInitialWorldState());
  const selected = engine.select(selectDomain, "disciplina");
  selected.totalXP = 999;
  equal(engine.select(selectDomain, "disciplina").totalXP, 0);
});

test("UPDATE_OBJECTIVE inválido no muta el estado", () => {
  const engine = new WorldEngine(createInitialWorldState());
  engine.dispatch(command(CommandType.MAKE_MISSION_AVAILABLE, { missionDefinitionId: "reconocer-piloto-automatico-demo" }));
  const started = engine.dispatch(command(CommandType.START_MISSION, { missionDefinitionId: "reconocer-piloto-automatico-demo" }));
  const before = engine.getSnapshot();
  const result = engine.dispatch(command(CommandType.UPDATE_OBJECTIVE, {
    missionInstanceId: started.data.missionInstanceId,
    objectiveId: "definir-respuesta-consciente",
    value: "",
  }));
  assert(!result.success);
  equal(JSON.stringify(engine.getSnapshot()), JSON.stringify(before));
});
