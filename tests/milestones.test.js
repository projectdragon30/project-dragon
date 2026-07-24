import { CommandType, MilestoneStatus } from "../js/constants/game-enums.js";
import { assert, equal, test } from "./test-utils.js";
import { command, completeCoreMission, createPhase5Engine } from "./phase5-test-helpers.js";

const milestoneId = "disciplina-hito-tecnico-demo";

test("hito LOCKED no puede completarse", () => {
  const engine = createPhase5Engine();
  const result = engine.dispatch(command(CommandType.COMPLETE_MILESTONE, { milestoneId }));
  assert(!result.success);
  equal(result.errors[0].code, "MILESTONE_NOT_AVAILABLE");
});

test("hito AVAILABLE con requisitos pendientes se rechaza", () => {
  const engine = createPhase5Engine();
  engine.dispatch(command(CommandType.MAKE_MILESTONE_AVAILABLE, { milestoneId }));
  const result = engine.dispatch(command(CommandType.COMPLETE_MILESTONE, { milestoneId }));
  assert(!result.success);
  equal(result.errors[0].code, "MILESTONE_REQUIREMENTS_NOT_MET");
});

test("hito válido se completa, registra evidencia y recalcula progreso sin XP", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  engine.dispatch(command(CommandType.MAKE_MILESTONE_AVAILABLE, { milestoneId }));
  const xpBefore = engine.getSnapshot().xpTransactions.length;
  const result = engine.dispatch(command(CommandType.COMPLETE_MILESTONE, {
    milestoneId, evidence: { kind: "TEXT", value: "evidencia" },
  }));
  assert(result.success);
  equal(result.events.map((event) => event.type).join(","), "MILESTONE_COMPLETED,DOMAIN_PROGRESS_UPDATED");
  const milestone = engine.getSnapshot().milestones[0];
  equal(milestone.status, MilestoneStatus.COMPLETED);
  equal(milestone.evidenceEntries.length, 1);
  equal(engine.getSnapshot().xpTransactions.length, xpBefore);
});

test("hito completado no puede duplicarse", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  engine.dispatch(command(CommandType.MAKE_MILESTONE_AVAILABLE, { milestoneId }));
  engine.dispatch(command(CommandType.COMPLETE_MILESTONE, { milestoneId }));
  const result = engine.dispatch(command(CommandType.COMPLETE_MILESTONE, { milestoneId }));
  assert(!result.success);
  equal(engine.getSnapshot().milestones[0].evidenceEntries.length, 0);
});
