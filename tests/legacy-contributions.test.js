import { DomainProgressionState } from "../js/constants/game-enums.js";
import {
  selectLegacyContributionBreakdown,
  selectLegacyContributionTotal,
} from "../js/selectors/world-selectors.js";
import { assert, equal, test } from "./test-utils.js";
import {
  challengeAndDefeatBoss,
  completeCoreMission,
  completeDemoMilestone,
  createPhase5Engine,
} from "./phase5-test-helpers.js";

test("completar CORE registra contribución positiva sin XP para Legado", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  const contributions = engine.getSnapshot().contributions;
  equal(contributions.length, 1);
  assert(contributions[0].amount > 0);
  equal(contributions[0].contributionType, "CORE_MISSION_COMPLETED");
  equal(engine.getSnapshot().domains.find((item) => item.id === "legado").totalXP, 0);
});

test("hito y jefe producen contribuciones separadas", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  completeDemoMilestone(engine);
  challengeAndDefeatBoss(engine);
  const types = engine.getSnapshot().contributions.map((item) => item.contributionType);
  assert(types.includes("MILESTONE_COMPLETED"));
  assert(types.includes("BOSS_DEFEATED"));
});

test("total y breakdown derivan de registros", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  completeDemoMilestone(engine);
  const total = engine.select(selectLegacyContributionTotal);
  const breakdown = engine.select(selectLegacyContributionBreakdown);
  equal(total, engine.getSnapshot().contributions.reduce((sum, item) => sum + item.amount, 0));
  assert(breakdown.byDomain.disciplina > 0);
});

test("contribuciones no cambian progressionState de Legado ni completan Nivel I", () => {
  const engine = createPhase5Engine();
  completeCoreMission(engine);
  equal(engine.getSnapshot().domains.find((item) => item.id === "legado").progressionState, DomainProgressionState.CONSEQUENCE);
  assert(!engine.getSnapshot().worldLevels[0].completionEnabled);
});
