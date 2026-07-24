export const UI_LABELS = Object.freeze({
  progression: Object.freeze({
    FUTURE: "Región futura", LOCKED: "Bloqueada", AVAILABLE: "Disponible",
    ACTIVE: "Activa", MASTERED: "Dominada", CONSEQUENCE: "Consecuencia",
  }),
  condition: Object.freeze({
    STABLE: "Estable", STRAINED: "En tensión", CORRUPTED: "Corrompida", RECOVERING: "En recuperación",
  }),
  mastery: Object.freeze({
    NOT_ELIGIBLE: "No elegible", ELIGIBLE: "Elegible", IN_REVIEW: "En revisión", MASTERED: "Dominada",
  }),
  mission: Object.freeze({
    HIDDEN: "Oculta", LOCKED: "Bloqueada", AVAILABLE: "Disponible", ACTIVE: "En curso",
    COMPLETED: "Completada", FAILED: "Fallida", ABANDONED: "Abandonada", EXPIRED: "Expirada",
  }),
});

export const EVENT_MESSAGES = Object.freeze({
  MISSION_STARTED: "Misión iniciada.",
  OBJECTIVE_UPDATED: "Objetivo actualizado.",
  EVIDENCE_SUBMITTED: "Evidencia registrada.",
  MISSION_COMPLETED: "Misión completada.",
  XP_GRANTED: "XP concedida.",
  DOMAIN_PROGRESS_UPDATED: "Progreso actualizado.",
});
