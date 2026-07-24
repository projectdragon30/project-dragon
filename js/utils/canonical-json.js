function normalize(value, path, ancestors) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new TypeError(`Valor no serializable en ${path}.`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError(`Número no finito en ${path}.`);
  if (value instanceof Date) throw new TypeError(`Date no permitido en ${path}.`);
  if (value === null || typeof value !== "object") return value;
  if (ancestors.has(value)) throw new TypeError(`Referencia circular en ${path}.`);
  ancestors.add(value);
  const normalized = Array.isArray(value)
    ? value.map((item, index) => normalize(item, `${path}[${index}]`, ancestors))
    : Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key], `${path}.${key}`, ancestors)]));
  ancestors.delete(value);
  return normalized;
}

export function canonicalStringify(value) {
  return JSON.stringify(normalize(value, "$", new WeakSet()));
}

export function computeIntegrityChecksum(value) {
  const text = canonicalStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
