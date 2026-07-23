export class RegionPanel {
  constructor(backdrop, stateLabels) {
    this.backdrop = backdrop;
    this.dialog = backdrop.querySelector(".region-dialog");
    this.closeButton = backdrop.querySelector(".dialog-close");
    this.actionButton = backdrop.querySelector(".dialog-action");
    this.stateLabels = stateLabels;
    this.trigger = null;

    this.closeButton.addEventListener("click", () => this.close());
    this.actionButton.addEventListener("click", () => this.close());
    this.backdrop.addEventListener("mousedown", (event) => {
      if (event.target === this.backdrop) this.close();
    });
    document.addEventListener("keydown", (event) => this.handleKeydown(event));
  }

  open(entity, trigger) {
    this.trigger = trigger;
    this.dialog.dataset.state = entity.state;
    this.backdrop.querySelector("#dialog-category").textContent = entity.category;
    this.backdrop.querySelector("#dialog-title").textContent = entity.name;
    this.backdrop.querySelector("#dialog-state").textContent = this.stateLabels[entity.state];
    this.backdrop.querySelector("#dialog-description").textContent = entity.shortDescription;
    this.backdrop.querySelector("#dialog-narrative").textContent = entity.narrative;
    this.actionButton.textContent = entity.actionLabel;
    this.backdrop.hidden = false;
    document.body.classList.add("dialog-open");
    requestAnimationFrame(() => this.backdrop.classList.add("is-visible"));
    this.closeButton.focus();
  }

  close() {
    if (this.backdrop.hidden) return;
    this.backdrop.classList.remove("is-visible");
    document.body.classList.remove("dialog-open");
    window.setTimeout(() => {
      this.backdrop.hidden = true;
      this.trigger?.focus();
      this.trigger = null;
    }, 180);
  }

  handleKeydown(event) {
    if (this.backdrop.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [...this.dialog.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
