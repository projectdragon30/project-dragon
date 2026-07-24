import { LocalStorageAdapter } from "../js/adapters/local-storage-adapter.js";
import { MemoryStorageAdapter } from "../js/adapters/memory-storage-adapter.js";
import { canonicalStringify } from "../js/utils/canonical-json.js";
import { assert, equal, test } from "./test-utils.js";

test("MemoryStorageAdapter guarda, lee, elimina y consulta claves", () => {
  const storage = new MemoryStorageAdapter();
  storage.setItem("project-dragon:a", "uno");
  equal(storage.getItem("project-dragon:a"), "uno");
  assert(storage.hasItem("project-dragon:a"));
  storage.removeItem("project-dragon:a");
  assert(!storage.hasItem("project-dragon:a"));
});

test("namespaces del adaptador no colisionan", () => {
  const storage = new MemoryStorageAdapter({ "project-dragon:a": "1", "other:a": "2" });
  equal(storage.listKeys("project-dragon:").length, 1);
  storage.clearNamespace("project-dragon:");
  equal(storage.getItem("other:a"), "2");
});

test("LocalStorageAdapter rechaza storage no disponible y normaliza errores", () => {
  let unavailable = false;
  try { new LocalStorageAdapter(null); } catch (error) { unavailable = error.code === "STORAGE_UNAVAILABLE"; }
  assert(unavailable);
  const adapter = new LocalStorageAdapter({ getItem() { throw new Error("fail"); } });
  let normalized = false;
  try { adapter.getItem("x"); } catch (error) { normalized = error.code === "STORAGE_READ_FAILED"; }
  assert(normalized);
});

test("canonical JSON ordena objetos, conserva arrays y no muta", () => {
  const input = { z: 1, a: { y: 2, x: 3 }, list: [2, 1] };
  const before = JSON.stringify(input);
  equal(canonicalStringify(input), canonicalStringify({ list: [2, 1], a: { x: 3, y: 2 }, z: 1 }));
  equal(JSON.stringify(input), before);
});

for (const [label, value] of [
  ["Date", new Date()],
  ["función", () => {}],
  ["undefined", undefined],
  ["NaN", Number.NaN],
  ["Infinity", Infinity],
]) {
  test(`canonical JSON rechaza ${label}`, () => {
    let rejected = false;
    try { canonicalStringify({ value }); } catch { rejected = true; }
    assert(rejected);
  });
}

test("canonical JSON rechaza ciclos", () => {
  const value = {}; value.self = value;
  let rejected = false;
  try { canonicalStringify(value); } catch { rejected = true; }
  assert(rejected);
});
