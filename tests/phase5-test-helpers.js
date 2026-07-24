import { CommandType } from "../js/constants/game-enums.js";
import { createInitialWorldState } from "../js/core/state-factory.js";
import { WorldEngine } from "../js/core/world-engine.js";

let sequence = 0;
export function command(type, payload = {}) {
  return {
    id: `phase5-command-${++sequence}`,
    type,
    payload,
    actor: "TEST",
    requestedAt: "2026-07-23T00:00:00.000Z",
  };
}

export function createPhase5Engine() {
  return new WorldEngine(createInitialWorldState({ createdAt: "2026-07-23T00:00:00.000Z" }), {
    clock: () => "2026-07-23T00:00:01.000Z",
  });
}

export function completeCoreMission(engine) {
  const definitionId = "reconocer-piloto-automatico-demo";
  engine.dispatch(command(CommandType.MAKE_MISSION_AVAILABLE, { missionDefinitionId: definitionId }));
  const started = engine.dispatch(command(CommandType.START_MISSION, { missionDefinitionId: definitionId }));
  const missionInstanceId = started.data.missionInstanceId;
  for (const objectiveId of ["identificar-disparador", "identificar-conducta-automatica", "identificar-consecuencia"]) {
    engine.dispatch(command(CommandType.SUBMIT_EVIDENCE, {
      missionInstanceId,
      objectiveId,
      evidence: { level: "SELF_REPORTED", kind: "TEXT", value: "evidencia DEMO" },
    }));
  }
  engine.dispatch(command(CommandType.UPDATE_OBJECTIVE, {
    missionInstanceId,
    objectiveId: "definir-respuesta-consciente",
    value: "decisión DEMO",
  }));
  return engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId }));
}

export function completeDemoMilestone(engine) {
  const milestoneId = "disciplina-hito-tecnico-demo";
  engine.dispatch(command(CommandType.MAKE_MILESTONE_AVAILABLE, { milestoneId }));
  return engine.dispatch(command(CommandType.COMPLETE_MILESTONE, {
    milestoneId,
    evidence: { kind: "TEXT", value: "evidencia técnica DEMO" },
  }));
}

export function challengeAndDefeatBoss(engine) {
  const bossId = "piloto-automatico";
  engine.dispatch(command(CommandType.EVALUATE_BOSS_AVAILABILITY, { bossId }));
  engine.dispatch(command(CommandType.CHALLENGE_BOSS, { bossId }));
  const definitionId = "piloto-automatico-desafio-tecnico-demo";
  const started = engine.dispatch(command(CommandType.START_MISSION, { missionDefinitionId: definitionId }));
  engine.dispatch(command(CommandType.UPDATE_OBJECTIVE, {
    missionInstanceId: started.data.missionInstanceId,
    objectiveId: "confirmar-desafio-tecnico-demo",
    value: true,
  }));
  engine.dispatch(command(CommandType.COMPLETE_MISSION, { missionInstanceId: started.data.missionInstanceId }));
  return engine.dispatch(command(CommandType.DEFEAT_BOSS, { bossId }));
}
