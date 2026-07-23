export function createStateSnapshot(state) {
  return JSON.parse(JSON.stringify(state));
}

export function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}
