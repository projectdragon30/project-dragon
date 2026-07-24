import { MissionController } from "../js/controllers/mission-controller.js";
import { assert, equal, test } from "./test-utils.js";

function setup(result = { success: true, events: [], errors: [] }) {
  const calls = [];
  const messages = [];
  const engine = {
    getSnapshot: () => ({ player: { id: "player" } }),
    execute(command) { calls.push(command); return result; },
  };
  const controller = new MissionController(engine, { show(type, message) { messages.push({ type, message }); } }, {
    clock: () => "2026-07-24T00:00:00.000Z",
  });
  return { controller, calls, messages };
}

for (const [label, invoke, type] of [
  ["START_MISSION", (controller) => controller.startMission("demo"), "START_MISSION"],
  ["UPDATE_OBJECTIVE", (controller) => controller.updateObjective("instance", "objective", true), "UPDATE_OBJECTIVE"],
  ["SUBMIT_EVIDENCE", (controller) => controller.submitEvidence("instance", "objective", "evidencia"), "SUBMIT_EVIDENCE"],
  ["COMPLETE_MISSION", (controller) => controller.completeMission("instance"), "COMPLETE_MISSION"],
]) {
  test(`${label} usa engine.execute`, () => {
    const { controller, calls } = setup();
    invoke(controller);
    equal(calls.length, 1);
    equal(calls[0].type, type);
  });
}

test("comando rechazado muestra error comprensible", () => {
  const { controller, messages } = setup({ success: false, events: [], errors: [{ code: "MISSION_REQUIREMENTS_NOT_MET" }] });
  controller.completeMission("instance");
  equal(messages[0].type, "error");
  assert(messages[0].message.includes("objetivos"));
});

test("evidencia vacía no envía comando", () => {
  const { controller, calls } = setup();
  controller.submitEvidence("instance", "objective", " ");
  equal(calls.length, 0);
});
