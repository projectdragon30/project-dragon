export class StorageAdapterError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = "StorageAdapterError";
    this.code = code;
    this.cause = cause;
  }
}

export class StorageAdapter {
  getItem() { throw new Error("getItem no implementado."); }
  setItem() { throw new Error("setItem no implementado."); }
  removeItem() { throw new Error("removeItem no implementado."); }
  hasItem(key) { return this.getItem(key) !== null; }
  listKeys() { return []; }
}
