import type {
  Category,
  CategoryKind,
  ChangeOrder,
  JobSnapshot,
  LineItem,
} from "./types";

export type ItemRollup = LineItem & {
  approvedCoCents: number;
  pendingCoCents: number;
  revisedBudgetCents: number;
  varianceCents: number;
  remainingCents: number;
  forecastCents: number;
  overBudget: boolean;
};

export type CategoryRollup = {
  category: Category;
  revisedBudgetCents: number;
  actualCents: number;
  committedCents: number;
  forecastCents: number;
  varianceCents: number;
  remainingCents: number;
  itemCount: number;
  overCount: number;
};

export type JobTotals = {
  saleCents: number;
  originalBudgetCents: number;
  revisedBudgetCents: number;
  actualCents: number;
  committedCents: number;
  forecastCents: number;
  remainingCents: number;
  varianceCents: number;
  profitAtBudgetCents: number;
  projectedProfitCents: number;
  marginAtBudget: number;
  projectedMargin: number;
  spentOfBudget: number;
  byKind: Record<CategoryKind, number>;
  overCount: number;
  pendingCoCount: number;
  pendingCoCents: number;
  contingencyBudgetCents: number;
  contingencyDrawnCents: number;
};

export function dollars(n: number): number {
  return Math.round(n * 100);
}

export function approvedCoTotal(itemId: number, cos: ChangeOrder[]): number {
  return cos
    .filter((c) => c.lineItemId === itemId && c.status === "approved")
    .reduce((s, c) => s + c.amountCents, 0);
}

export function pendingCoTotal(itemId: number, cos: ChangeOrder[]): number {
  return cos
    .filter((c) => c.lineItemId === itemId && c.status === "pending")
    .reduce((s, c) => s + c.amountCents, 0);
}

export function rollupItem(item: LineItem, cos: ChangeOrder[]): ItemRollup {
  const approvedCoCents = approvedCoTotal(item.id, cos);
  const pendingCoCents = pendingCoTotal(item.id, cos);
  const revisedBudgetCents = item.originalBudgetCents + approvedCoCents;
  const varianceCents = revisedBudgetCents - item.actualCents;
  const remainingCents = Math.max(0, revisedBudgetCents - item.actualCents);
  const forecastCents =
    item.pctComplete >= 100
      ? item.actualCents
      : Math.max(revisedBudgetCents, item.actualCents);
  return {
    ...item,
    approvedCoCents,
    pendingCoCents,
    revisedBudgetCents,
    varianceCents,
    remainingCents,
    forecastCents,
    overBudget: item.actualCents > revisedBudgetCents + 50,
  };
}

export function rollupJob(snap: JobSnapshot): {
  items: ItemRollup[];
  categories: CategoryRollup[];
  totals: JobTotals;
} {
  const items = snap.items.map((item) => rollupItem(item, snap.changeOrders));
  const catMap = new Map(snap.categories.map((c) => [c.id, c]));

  const categories: CategoryRollup[] = snap.categories.map((category) => {
    const rows = items.filter((i) => i.categoryId === category.id);
    const revisedBudgetCents = rows.reduce((s, r) => s + r.revisedBudgetCents, 0);
    const actualCents = rows.reduce((s, r) => s + r.actualCents, 0);
    const committedCents = rows.reduce((s, r) => s + r.committedCents, 0);
    const forecastCents = rows.reduce((s, r) => s + r.forecastCents, 0);
    return {
      category,
      revisedBudgetCents,
      actualCents,
      committedCents,
      forecastCents,
      varianceCents: revisedBudgetCents - actualCents,
      remainingCents: Math.max(0, revisedBudgetCents - actualCents),
      itemCount: rows.length,
      overCount: rows.filter((r) => r.overBudget).length,
    };
  });

  const byKind: Record<CategoryKind, number> = {
    land: 0,
    soft: 0,
    hard: 0,
    contingency: 0,
  };
  for (const row of categories) {
    byKind[row.category.kind] += row.revisedBudgetCents;
  }

  const revisedBudgetCents = items.reduce((s, r) => s + r.revisedBudgetCents, 0);
  const originalBudgetCents = items.reduce((s, r) => s + r.originalBudgetCents, 0);
  const actualCents = items.reduce((s, r) => s + r.actualCents, 0);
  const committedCents = items.reduce((s, r) => s + r.committedCents, 0);
  const forecastCents = items.reduce((s, r) => s + r.forecastCents, 0);
  const saleCents = snap.job.targetSaleCents;
  const profitAtBudgetCents = saleCents - revisedBudgetCents;
  const projectedProfitCents = saleCents - forecastCents;
  const contingency = categories.find((c) => c.category.kind === "contingency");

  const pending = snap.changeOrders.filter((c) => c.status === "pending");

  return {
    items,
    categories,
    totals: {
      saleCents,
      originalBudgetCents,
      revisedBudgetCents,
      actualCents,
      committedCents,
      forecastCents,
      remainingCents: Math.max(0, revisedBudgetCents - actualCents),
      varianceCents: revisedBudgetCents - actualCents,
      profitAtBudgetCents,
      projectedProfitCents,
      marginAtBudget: saleCents === 0 ? 0 : (profitAtBudgetCents / saleCents) * 100,
      projectedMargin: saleCents === 0 ? 0 : (projectedProfitCents / saleCents) * 100,
      spentOfBudget: revisedBudgetCents === 0 ? 0 : (actualCents / revisedBudgetCents) * 100,
      byKind,
      overCount: items.filter((i) => i.overBudget).length,
      pendingCoCount: pending.length,
      pendingCoCents: pending.reduce((s, c) => s + c.amountCents, 0),
      contingencyBudgetCents: contingency?.revisedBudgetCents ?? 0,
      contingencyDrawnCents: contingency?.actualCents ?? 0,
      // silence unused
      ...(catMap.size >= 0 ? {} : {}),
    },
  };
}

export function itemStatus(item: ItemRollup): "complete" | "over" | "active" | "planned" {
  if (item.overBudget) return "over";
  if (item.pctComplete >= 100 || (item.actualCents > 0 && item.remainingCents === 0)) {
    return "complete";
  }
  if (item.actualCents > 0 || item.pctComplete > 0 || item.committedCents > 0) return "active";
  return "planned";
}
