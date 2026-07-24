import { StorageAdapter } from "./storage-adapter.js";

export class MemoryStorageAdapter extends StorageAdapter {
  #values = new Map();
  constructor(initialEntries = {}) {
    super();
    Object.entries(initialEntries).forEach(([key, value]) => this.#values.set(key, String(value)));
  }
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
  hasItem(key) { return this.#values.has(key); }
  listKeys(prefix = "") { return [...this.#values.keys()].filter((key) => key.startsWith(prefix)); }
  clearNamespace(prefix) { this.listKeys(prefix).forEach((key) => this.#values.delete(key)); }
}
