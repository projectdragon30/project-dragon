import { DomainPanelController } from "../js/controllers/domain-panel-controller.js";
import { assert, equal, test } from "./test-utils.js";

test("DomainPanelController expone cierre seguro cuando ya está oculto", () => {
  const controller = Object.create(DomainPanelController.prototype);
  controller.backdrop = { hidden: true };
  controller.close();
  assert(controller.backdrop.hidden);
});

test("Escape solicita cierre del panel", () => {
  const controller = Object.create(DomainPanelController.prototype);
  controller.backdrop = { hidden: false };
  let closed = 0; controller.close = () => { closed += 1; };
  controller.onKeydown({ key: "Escape", preventDefault() {} });
  equal(closed, 1);
});

test("render ignora View Model de otro Domain", () => {
  const controller = Object.create(DomainPanelController.prototype);
  controller.domainId = "vida";
  controller.render({}, { id: "mente" });
  equal(controller.domainId, "vida");
});
