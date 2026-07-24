import { regions } from "../data/regiones.js";
import { createDomainViewModel } from "../view-models/domain-view-model.js";
import { createWorldViewModel } from "../view-models/world-view-model.js";
import { MapController } from "../controllers/map-controller.js";
import { DomainPanelController } from "../controllers/domain-panel-controller.js";
import { MissionController } from "../controllers/mission-controller.js";
import { EVENT_MESSAGES } from "../presentation/ui-labels.js";

export function createApplication({ engine, document, notifications }) {
  const map = document.querySelector("#game-map");
  const sanctuary = document.querySelector(".sanctuary");
  const linesGroup = document.querySelector("#connection-lines");
  const missionController = new MissionController(engine, notifications);
  const panel = new DomainPanelController(document.querySelector("#dialog-backdrop"), missionController);
  const drawConnections = () => {
    const mapRect = map.getBoundingClientRect();
    const centerRect = sanctuary.getBoundingClientRect();
    const centerX = centerRect.left + centerRect.width / 2 - mapRect.left;
    const centerY = centerRect.top + centerRect.height / 2 - mapRect.top;
    linesGroup.replaceChildren();
    document.querySelectorAll(".region-node").forEach((node) => {
      const rect = node.getBoundingClientRect();
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", centerX); line.setAttribute("y1", centerY);
      line.setAttribute("x2", rect.left + rect.width / 2 - mapRect.left);
      line.setAttribute("y2", rect.top + rect.height / 2 - mapRect.top);
      line.dataset.state = node.dataset.progressionState?.toLowerCase() ?? "active";
      linesGroup.append(line);
    });
  };
  const mapController = new MapController({
    regionLayer: document.querySelector("#region-layer"),
    bossNode: document.querySelector(".boss-node"),
    onOpenDomain: (domainId, trigger) => {
      const state = engine.getSnapshot();
      const region = regions.find((item) => item.domainId === domainId);
      panel.open(domainId, trigger, state, createDomainViewModel(state, region));
    },
    drawConnections,
  });
  mapController.init();
  let currentWorld = null;
  const render = () => {
    const state = engine.getSnapshot();
    currentWorld = createWorldViewModel(state);
    mapController.render(currentWorld);
    if (panel.domainId && !panel.backdrop.hidden) {
      panel.render(state, currentWorld.domains.find((item) => item.id === panel.domainId));
    }
  };
  const unsubscribe = engine.subscribe((_snapshot, events) => {
    render();
    const message = events.map((event) => EVENT_MESSAGES[event.type]).filter(Boolean).at(-1);
    if (message) notifications.show("info", message);
  });
  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => requestAnimationFrame(drawConnections))
    : null;
  resizeObserver?.observe(map);
  render();
  return {
    engine,
    render,
    controllers: { mapController, panel, missionController },
    destroy() { unsubscribe(); mapController.destroy(); resizeObserver?.disconnect(); },
    getWorldViewModel() { return currentWorld; },
  };
}
