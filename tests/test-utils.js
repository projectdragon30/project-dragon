const tests = [];

export function test(name, callback) {
  tests.push({ name, callback });
}

export function assert(condition, message = "La condición esperada no se cumplió.") {
  if (!condition) throw new Error(message);
}

export function equal(actual, expected, message = "Los valores no coinciden.") {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} Esperado: ${String(expected)}. Recibido: ${String(actual)}.`);
  }
}

export function deepEqual(actual, expected, message = "Las estructuras no coinciden.") {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nEsperado: ${expectedJson}\nRecibido: ${actualJson}`);
  }
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function collectForbiddenValues(value, path = "$", ancestors = new WeakSet(), findings = []) {
  if (typeof value === "function") findings.push({ path, type: "function" });
  if (value instanceof Date) findings.push({ path, type: "Date" });
  if (value === null || typeof value !== "object") return findings;
  if (ancestors.has(value)) {
    findings.push({ path, type: "circular" });
    return findings;
  }
  ancestors.add(value);
  Object.entries(value).forEach(([key, child]) => {
    collectForbiddenValues(child, `${path}.${key}`, ancestors, findings);
  });
  ancestors.delete(value);
  return findings;
}

export async function runTests() {
  const results = [];

  for (const entry of tests) {
    try {
      await entry.callback();
      results.push({ name: entry.name, passed: true });
    } catch (error) {
      results.push({
        name: entry.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    total: results.length,
    results,
  };
}
