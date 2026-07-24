import { createMissionViewModel } from "../view-models/mission-view-model.js";

function appendText(document, parent, tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

export class DomainPanelController {
  constructor(backdrop, missionController) {
    this.backdrop = backdrop;
    this.dialog = backdrop.querySelector(".region-dialog");
    this.closeButton = backdrop.querySelector(".dialog-close");
    this.content = backdrop.querySelector("#dialog-content");
    this.missionController = missionController;
    this.trigger = null;
    this.domainId = null;
    this.closeButton.addEventListener("click", () => this.close());
    this.backdrop.addEventListener("mousedown", (event) => { if (event.target === this.backdrop) this.close(); });
    this.handleKeydown = (event) => this.onKeydown(event);
    this.backdrop.ownerDocument.addEventListener("keydown", this.handleKeydown);
  }
  open(domainId, trigger, state, domainViewModel) {
    this.domainId = domainId;
    this.trigger = trigger;
    this.render(state, domainViewModel);
    this.backdrop.hidden = false;
    this.backdrop.ownerDocument.body.classList.add("dialog-open");
    requestAnimationFrame(() => this.backdrop.classList.add("is-visible"));
    this.closeButton.focus();
  }
  render(state, domain) {
    if (!domain || domain.id !== this.domainId) return;
    const document = this.backdrop.ownerDocument;
    this.dialog.dataset.state = domain.progressionState.toLowerCase();
    this.backdrop.querySelector("#dialog-category").textContent = domain.subtitle;
    this.backdrop.querySelector("#dialog-title").textContent = domain.title;
    this.backdrop.querySelector("#dialog-state").textContent = `${domain.statusLabel} · ${domain.conditionLabel}`;
    this.content.replaceChildren();
    const stats = document.createElement("dl");
    stats.className = "domain-stats";
    for (const [label, value] of [
      ["XP total", domain.xpLabel], ["XP del Tier", domain.tierXPLabel],
      ["Progreso", domain.progressLabel], ["Completitud", domain.completionLabel],
      ["Maestría", domain.masteryLabel],
    ]) {
      appendText(document, stats, "dt", "", label);
      appendText(document, stats, "dd", "", value);
    }
    this.content.append(stats);
    const definitions = state.missionDefinitions.filter((mission) => mission.primaryDomainId === domain.id && mission.id === "reconocer-piloto-automatico-demo");
    definitions.forEach((definition) => this.content.append(this.renderMission(document, createMissionViewModel(state, definition))));
  }
  renderMission(document, mission) {
    const section = document.createElement("section");
    section.className = "mission-card";
    section.dataset.missionId = mission.id;
    appendText(document, section, "p", "mission-card__demo", mission.isDemo ? "DEMO" : "");
    appendText(document, section, "h3", "", mission.title);
    appendText(document, section, "p", "mission-card__status", `${mission.statusLabel} · ${mission.progressPercent}% · ${mission.rewardSummary}`);
    if (mission.canStart) {
      const button = appendText(document, section, "button", "pd-button mission-start", "Iniciar misión");
      button.type = "button";
      button.addEventListener("click", () => this.missionController.startMission(mission.id));
      return section;
    }
    if (mission.instanceId) mission.objectives.forEach((objective) =>
      section.append(this.renderObjective(document, mission, objective)));
    if (mission.canUpdate || mission.status === "COMPLETED") {
      const complete = appendText(document, section, "button", "pd-button mission-complete", mission.status === "COMPLETED" ? "Misión completada" : "Completar misión");
      complete.type = "button";
      complete.disabled = !mission.canComplete;
      if (mission.canComplete) complete.addEventListener("click", () => this.missionController.completeMission(mission.instanceId));
    }
    return section;
  }
  renderObjective(document, mission, objective) {
    const field = document.createElement("div");
    field.className = "mission-objective";
    const label = appendText(document, field, "label", "", objective.label);
    if (objective.controlType === "evidence") {
      const input = document.createElement("textarea");
      input.rows = 2;
      input.disabled = objective.completed || !mission.canUpdate;
      label.append(input);
      const button = appendText(document, field, "button", "pd-button", objective.completed ? "Evidencia registrada" : "Guardar evidencia");
      button.type = "button";
      button.disabled = objective.completed || !mission.canUpdate;
      button.addEventListener("click", () => this.missionController.submitEvidence(mission.instanceId, objective.id, input.value));
    } else if (objective.controlType === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = objective.currentValue === true;
      input.disabled = !mission.canUpdate;
      label.prepend(input);
      input.addEventListener("change", () => this.missionController.updateObjective(mission.instanceId, objective.id, input.checked));
    } else {
      const input = document.createElement(objective.controlType === "text" ? "textarea" : "input");
      if (input.tagName === "INPUT") { input.type = "number"; input.min = "0"; }
      input.value = objective.currentValue ?? "";
      input.disabled = !mission.canUpdate;
      label.append(input);
      const button = appendText(document, field, "button", "pd-button", "Guardar");
      button.type = "button";
      button.disabled = !mission.canUpdate;
      button.addEventListener("click", () => {
        const value = objective.controlType === "number" ? Number(input.value) : input.value;
        this.missionController.updateObjective(mission.instanceId, objective.id, value);
      });
    }
    appendText(document, field, "span", "objective-progress", `${Math.round(objective.progress * 100)}%`);
    return field;
  }
  close() {
    if (this.backdrop.hidden) return;
    this.backdrop.classList.remove("is-visible");
    this.backdrop.ownerDocument.body.classList.remove("dialog-open");
    setTimeout(() => { this.backdrop.hidden = true; this.trigger?.focus(); this.trigger = null; }, 180);
  }
  onKeydown(event) {
    if (this.backdrop.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); this.close(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...this.dialog.querySelectorAll("button:not([disabled]), textarea:not([disabled]), input:not([disabled])")];
    if (!focusable.length) return;
    const [first] = focusable; const last = focusable.at(-1);
    const activeElement = this.backdrop.ownerDocument.activeElement;
    if (event.shiftKey && activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && activeElement === last) { event.preventDefault(); first.focus(); }
  }
}
