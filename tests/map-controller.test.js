import { MapController } from "../js/controllers/map-controller.js";
import { assert, equal, test } from "./test-utils.js";

function fakeNode() {
  const parts = { ".region-node__name": { textContent: "" }, ".region-node__state": { textContent: "" } };
  return {
    className: "", dataset: {}, attrs: {},
    setAttribute(key, value) { this.attrs[key] = value; },
    querySelector(selector) { return parts[selector]; },
    parts,
  };
}

test("MapController aplica clases combinadas y data attributes", () => {
  const controller = new MapController({});
  const node = fakeNode();
  controller.updateRegionNode(node, {
    id: "disciplina", title: "Disciplina", progressionState: "MASTERED", conditionState: "CORRUPTED",
    masteryStatus: "MASTERED", ariaLabel: "Disciplina", statusLabel: "Dominada", conditionLabel: "Corrompida",
  });
  assert(node.className.includes("region--mastered") && node.className.includes("region--corrupted"));
  equal(node.dataset.domainId, undefined);
  equal(node.dataset.progressionState, "MASTERED");
  equal(node.dataset.conditionState, "CORRUPTED");
  equal(node.dataset.masteryStatus, "MASTERED");
});

test("click, Enter y Space abren el panel una vez por evento", () => {
  const calls = [];
  const controller = new MapController({ onOpenDomain: (id) => calls.push(id) });
  const node = { dataset: { domainId: "vida" } };
  controller.handleClick({ target: { closest: () => node } });
  controller.handleKeydown({ key: "Enter", target: { closest: () => node }, preventDefault() {} });
  controller.handleKeydown({ key: " ", target: { closest: () => node }, preventDefault() {} });
  equal(calls.length, 3);
});

test("evento sin región no abre panel", () => {
  let calls = 0;
  const controller = new MapController({ onOpenDomain: () => { calls += 1; } });
  controller.handleClick({ target: { closest: () => null } });
  equal(calls, 0);
});
