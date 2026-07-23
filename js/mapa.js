import { regions, specialEntities, stateLabels } from "./data/regiones.js";
import { RegionPanel } from "./components/region-panel.js";

const regionLayer = document.querySelector("#region-layer");
const map = document.querySelector("#game-map");
const linesGroup = document.querySelector("#connection-lines");
const sanctuary = document.querySelector(".sanctuary");
const panel = new RegionPanel(document.querySelector("#dialog-backdrop"), stateLabels);
const entities = new Map([
  ...regions.map((region) => [region.id, region]),
  ...Object.values(specialEntities).map((entity) => [entity.id, entity]),
]);

function createRegionNode(region, index) {
  const node = document.createElement("button");
  node.type = "button";
  node.className = `region-node region-node--${region.state} pd-node pd-node--${region.state}`;
  node.dataset.entityId = region.id;
  node.dataset.position = String(index + 1);
  node.setAttribute("aria-label", `${region.name}. ${stateLabels[region.state]}. Abrir información.`);
  node.innerHTML = `
    <span class="region-node__glyph" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
    <span class="region-node__name">${region.name}</span>
    <span class="region-node__state">${stateLabels[region.state]}</span>
  `;
  return node;
}

regions.forEach((region, index) => regionLayer.append(createRegionNode(region, index)));

map.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-entity-id]");
  if (!trigger) return;
  const entity = entities.get(trigger.dataset.entityId);
  if (entity) panel.open(entity, trigger);
});

function drawConnections() {
  const mapRect = map.getBoundingClientRect();
  const centerRect = sanctuary.getBoundingClientRect();
  const centerX = centerRect.left + centerRect.width / 2 - mapRect.left;
  const centerY = centerRect.top + centerRect.height / 2 - mapRect.top;

  linesGroup.replaceChildren();
  document.querySelectorAll(".region-node").forEach((node) => {
    const rect = node.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - mapRect.left;
    const y = rect.top + rect.height / 2 - mapRect.top;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add("connection-line");
    line.setAttribute("x1", centerX);
    line.setAttribute("y1", centerY);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
    line.dataset.state = entities.get(node.dataset.entityId).state;
    linesGroup.append(line);
  });
}

const resizeObserver = new ResizeObserver(() => requestAnimationFrame(drawConnections));
resizeObserver.observe(map);
window.addEventListener("load", drawConnections);
