import type { ValuedProtocol } from './model.ts';

export function buildFarmSteps(row: Omit<ValuedProtocol, 'rank'> | ValuedProtocol): string[] {
  const chain = row.chains[0] ?? 'its primary network';
  const category = row.category.toLowerCase();
  return [
    `Set up a fresh wallet for ${chain}; transfer in $60, keep $10 for gas, and allow 15 minutes for confirmation.`,
    `Swap $25 into an asset accepted by ${row.name}; expect 5 minutes and cap swap plus network costs at $6.`,
    `Deposit $25 into the ${category} strategy, then review it after 24 hours; keep $5 available to exit.`,
  ].map((step) => step.trim());
}
