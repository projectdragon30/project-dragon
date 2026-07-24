import { StorageAdapter, StorageAdapterError } from "./storage-adapter.js";

export class LocalStorageAdapter extends StorageAdapter {
  constructor(storage) {
    super();
    if (!storage || typeof storage.getItem !== "function") {
      throw new StorageAdapterError("STORAGE_UNAVAILABLE", "localStorage no está disponible.");
    }
    this.storage = storage;
  }
  getItem(key) {
    try { return this.storage.getItem(key); } catch (error) {
      throw new StorageAdapterError("STORAGE_READ_FAILED", `No se pudo leer ${key}.`, error);
    }
  }
  setItem(key, value) {
    try { this.storage.setItem(key, String(value)); } catch (error) {
      throw new StorageAdapterError("STORAGE_WRITE_FAILED", `No se pudo escribir ${key}.`, error);
    }
  }
  removeItem(key) {
    try { this.storage.removeItem(key); } catch (error) {
      throw new StorageAdapterError("STORAGE_REMOVE_FAILED", `No se pudo eliminar ${key}.`, error);
    }
  }
  hasItem(key) { return this.getItem(key) !== null; }
  listKeys(prefix = "") {
    const keys = [];
    try {
      for (let index = 0; index < this.storage.length; index += 1) {
        const key = this.storage.key(index);
        if (key?.startsWith(prefix)) keys.push(key);
      }
      return keys;
    } catch (error) {
      throw new StorageAdapterError("STORAGE_READ_FAILED", "No se pudieron enumerar las claves.", error);
    }
  }
}
