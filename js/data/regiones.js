export const regions = Object.freeze([
  ["vida", "Vida", "Región vital"],
  ["mente", "Mente", "Región interior"],
  ["disciplina", "Disciplina", "Región de práctica"],
  ["imperio", "Imperio", "Región de construcción"],
  ["proposito", "Propósito", "Región de dirección"],
  ["relaciones", "Relaciones", "Región futura"],
  ["sabiduria", "Sabiduría", "Región futura"],
  ["legado", "Legado", "Región de consecuencia"],
].map(([domainId, title, subtitle], index) => Object.freeze({
  id: `region-${domainId}`,
  domainId,
  title,
  subtitle,
  position: index + 1,
  dimensions: Object.freeze({ variant: "standard" }),
  visualVariant: domainId === "legado" ? "consequence" : "domain",
  connectionAnchors: Object.freeze({ source: "sanctuary", target: "center" }),
  accessibilityLabel: `Abrir región ${title}`,
})));

export const specialEntities = Object.freeze({
  sanctuary: Object.freeze({
    id: "sanctuary",
    title: "Santuario del Dragón",
    accessibilityLabel: "Abrir Santuario del Dragón",
  }),
  boss: Object.freeze({
    id: "boss",
    bossId: "piloto-automatico",
    title: "EL PILOTO AUTOMÁTICO",
    accessibilityLabel: "Abrir jefe del nivel: El Piloto Automático",
  }),
});
