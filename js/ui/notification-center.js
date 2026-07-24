export class NotificationCenter {
  constructor(container, options = {}) {
    this.container = container;
    this.console = options.console ?? globalThis.console;
  }
  show(type, message, technical = null) {
    if (!this.container) return;
    const item = this.container.ownerDocument.createElement("p");
    item.className = `notification notification--${type}`;
    item.setAttribute("role", type === "error" ? "alert" : "status");
    item.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    item.textContent = message;
    if (technical) {
      item.dataset.errorCode = technical.code ?? "UNKNOWN";
      this.console?.error?.("[PROJECT DRAGON]", technical);
    }
    this.container.replaceChildren(item);
  }
}
