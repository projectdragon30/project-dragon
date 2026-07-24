import { migrateV1ToV2 } from "./migrate-v1-to-v2.js";

export const MIGRATION_REGISTRY = Object.freeze({
  "0.9.0": Object.freeze({ toVersion: "1.0.0", migrate: migrateV1ToV2 }),
});
