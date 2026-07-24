import { CommandType } from "../constants/game-enums.js";
import { humanizeError } from "../presentation/ui-formatters.js";

export class MissionController {
  constructor(engine, notifications, options = {}) {
    this.engine = engine;
    this.notifications = notifications;
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.sequence = 0;
  }
  buildCommand(type, payload) {
    this.sequence += 1;
    const snapshot = this.engine.getSnapshot();
    return {
      id: `ui-${this.clock().replace(/[^0-9]/g, "")}-${String(this.sequence).padStart(4, "0")}`,
      type,
      payload,
      actor: { type: "PLAYER", id: snapshot.player.id },
      requestedAt: this.clock(),
    };
  }
  execute(type, payload, successMessage) {
    const result = this.engine.execute(this.buildCommand(type, payload));
    if (!result.success) {
      this.notifications.show("error", humanizeError(result.errors[0]), result.errors[0]);
      return result;
    }
    if (result.autosaveError) {
      this.notifications.show("warning", "El progreso continúa en esta sesión, pero no pudo guardarse.", result.autosaveError);
    } else if (successMessage) this.notifications.show("success", successMessage);
    return result;
  }
  startMission(missionDefinitionId) {
    return this.execute(CommandType.START_MISSION, { missionDefinitionId }, "Misión iniciada.");
  }
  updateObjective(missionInstanceId, objectiveId, value) {
    return this.execute(CommandType.UPDATE_OBJECTIVE, { missionInstanceId, objectiveId, value }, "Objetivo actualizado.");
  }
  submitEvidence(missionInstanceId, objectiveId, value) {
    if (typeof value !== "string" || !value.trim()) {
      this.notifications.show("error", "Escribe una evidencia antes de guardarla.");
      return { success: false, events: [], errors: [{ code: "INVALID_EVIDENCE" }] };
    }
    return this.execute(CommandType.SUBMIT_EVIDENCE, {
      missionInstanceId,
      objectiveId,
      evidence: { level: "SELF_REPORTED", kind: "TEXT", value: value.trim() },
    }, "Evidencia registrada.");
  }
  completeMission(missionInstanceId) {
    return this.execute(CommandType.COMPLETE_MISSION, { missionInstanceId }, "Misión completada.");
  }
}
