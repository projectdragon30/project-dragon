import { grantXP } from "./xp-service.js";

export function processMissionRewards(state, definition, instance, command, timestamp) {
  const events = [];
  const transactions = [];

  for (const reward of definition.rewards ?? []) {
    const transactionId = `reward-${instance.id}-${reward.id}`;
    if (state.rewardTransactions.some((transaction) => transaction.id === transactionId)) continue;
    if (reward.rewardType !== "XP" || !Number.isFinite(reward.amount) || reward.amount <= 0) {
      return { success: false, error: { code: "INVALID_REWARD", message: `Recompensa inválida: ${reward.id}.` } };
    }
    const transaction = {
      id: transactionId,
      rewardDefinitionId: reward.id,
      rewardType: reward.rewardType,
      sourceType: "MISSION",
      sourceId: instance.id,
      targetType: reward.targetType,
      targetId: reward.targetId,
      value: reward.amount,
      createdAt: timestamp,
      commandId: command.id,
      xpTransactionIds: [],
    };
    state.rewardTransactions.push(transaction);
    const xpResult = grantXP(state, {
      amount: reward.amount,
      domainId: reward.domainId,
      domainTierId: reward.targetId,
      sourceType: "MISSION",
      sourceId: instance.id,
      rewardTransactionId: transaction.id,
      commandId: command.id,
      createdAt: timestamp,
    });
    if (xpResult.error) return { success: false, error: xpResult.error };
    if (xpResult.granted) transaction.xpTransactionIds.push(xpResult.transaction.id);
    transactions.push(transaction);
    events.push({
      type: "MISSION_REWARD_GRANTED",
      payload: { missionInstanceId: instance.id, rewardTransactionId: transaction.id, rewardDefinitionId: reward.id },
    });
    if (xpResult.granted) {
      events.push({
        type: "XP_GRANTED",
        payload: {
          xpTransactionId: xpResult.transaction.id,
          domainId: xpResult.transaction.domainId,
          domainTierId: xpResult.transaction.domainTierId,
          amount: xpResult.transaction.amount,
        },
      });
    }
  }
  return { success: true, transactions, events };
}
