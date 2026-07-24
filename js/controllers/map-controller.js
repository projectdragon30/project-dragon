export class MapController {
  constructor(options) {
    Object.assign(this, options);
    this.nodes = new Map();
    this.handleClick = (event) => {
      const node = event.target.closest?.("[data-region-id]");
      if (node) this.onOpenDomain(node.dataset.domainId, node);
    };
    this.handleKeydown = (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      const node = event.target.closest?.("[data-region-id]");
      if (!node) return;
      event.preventDefault();
      this.onOpenDomain(node.dataset.domainId, node);
    };
  }
  init() {
    this.regionLayer.addEventListener("click", this.handleClick);
    this.regionLayer.addEventListener("keydown", this.handleKeydown);
  }
  render(world) {
    world.domains.forEach((domain, index) => {
      let node = this.nodes.get(domain.regionId);
      if (!node) {
        node = this.createRegionNode(domain, index);
        this.nodes.set(domain.regionId, node);
        this.regionLayer.append(node);
      }
      this.updateRegionNode(node, domain);
    });
    if (this.bossNode && world.boss) {
      this.bossNode.dataset.bossStatus = world.boss.status;
      this.bossNode.setAttribute("aria-label", world.boss.ariaLabel);
    }
    this.drawConnections?.();
  }
  createRegionNode(domain, index) {
    const document = this.regionLayer.ownerDocument;
    const node = document.createElement("button");
    node.type = "button";
    node.dataset.regionId = domain.regionId;
    node.dataset.domainId = domain.id;
    node.dataset.position = String(index + 1);
    const glyph = document.createElement("span");
    glyph.className = "region-node__glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "region-node__name";
    const state = document.createElement("span");
    state.className = "region-node__state";
    node.append(glyph, name, state);
    return node;
  }
  updateRegionNode(node, domain) {
    node.className = `region-node pd-node region--${domain.progressionState.toLowerCase()} region--${domain.conditionState.toLowerCase()}`;
    node.dataset.progressionState = domain.progressionState;
    node.dataset.conditionState = domain.conditionState;
    node.dataset.masteryStatus = domain.masteryStatus;
    node.setAttribute("aria-label", domain.ariaLabel);
    node.querySelector(".region-node__name").textContent = domain.title;
    node.querySelector(".region-node__state").textContent =
      domain.conditionState === "STABLE" ? domain.statusLabel : `${domain.statusLabel} · ${domain.conditionLabel}`;
  }
  destroy() {
    this.regionLayer.removeEventListener("click", this.handleClick);
    this.regionLayer.removeEventListener("keydown", this.handleKeydown);
  }
}
