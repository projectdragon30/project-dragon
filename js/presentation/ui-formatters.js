export const formatPercent = (value) => `${Math.round((value ?? 0) * 100)}%`;
export const formatXP = (value) => `${value ?? 0} XP`;
export function humanizeError(error) {
  const messages = {
    MISSION_REQUIREMENTS_NOT_MET: "Completa todos los objetivos obligatorios antes de cerrar la misión.",
    INVALID_OBJECTIVE_VALUE: "El valor del objetivo no es válido.",
    INVALID_EVIDENCE: "La evidencia debe contener texto válido.",
    MISSION_NOT_AVAILABLE: "La misión todavía no está disponible.",
  };
  return messages[error?.code] ?? error?.message ?? "No fue posible completar la acción.";
}
