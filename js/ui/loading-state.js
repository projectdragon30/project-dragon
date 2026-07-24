export class LoadingState {
  constructor(element) { this.element = element; }
  setLoading(active, message = "Cargando partida…") {
    if (!this.element) return;
    this.element.hidden = !active;
    this.element.textContent = message;
    this.element.setAttribute("aria-busy", String(active));
  }
}
