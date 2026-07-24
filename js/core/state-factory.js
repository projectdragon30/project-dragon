import { INITIAL_WORLD_CONTENT } from "../data/world-content.js";
import { MissionStatus } from "../constants/game-enums.js";
import { assertValidWorldState } from "../validators/world-state-validator.js";

export const WORLD_STATE_SCHEMA_VERSION = "1.0.0";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createInitialWorldState(options = {}) {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const content = cloneJson(INITIAL_WORLD_CONTENT);

  const state = {
    schemaVersion: WORLD_STATE_SCHEMA_VERSION,
    metadata: {
      createdAt,
      updatedAt: createdAt,
    },
    player: {
      id: "player",
    },
    currentWorldLevelId: "awakening",
    worldLevels: content.worldLevels,
    domains: content.domains,
    domainTiers: content.domainTiers,
    affinities: content.affinities,
    contributions: content.contributions,
    missionDefinitions: content.missionDefinitions,
    missionInstances: [],
    milestones: content.milestones,
    bosses: content.bosses,
    xpTransactions: [],
    rewardTransactions: [],
    eventLog: [],
    system: {
      lastEventSequence: 0,
      conditionSignals: [],
      restorationHistory: [],
      missionAvailability: Object.fromEntries(
        content.missionDefinitions.map((definition) => [definition.id, MissionStatus.HIDDEN]),
      ),
    },
  };

  assertValidWorldState(state);
  return state;
}

export function serializeWorldState(state) {
  assertValidWorldState(state);
  return JSON.stringify(state);
}

export function deserializeWorldState(serializedState) {
  let state;

  try {
    state = JSON.parse(serializedState);
  } catch (error) {
    throw new TypeError(`World State JSON inválido: ${error.message}`);
  }

  assertValidWorldState(state);
  return state;
}
