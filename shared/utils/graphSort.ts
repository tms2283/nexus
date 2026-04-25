export function topoSort(
  conceptIds: string[],
  edges: Array<{ from: string; to: string }>
): string[] {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of conceptIds) {
    indeg.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  const queue = Array.from(indeg.entries())
    .filter(([, d]) => d === 0)
    .map(([id]) => id);
  const result: string[] = [];

  while (queue.length) {
    const n = queue.shift()!;
    result.push(n);
    for (const m of adj.get(n) ?? []) {
      indeg.set(m, indeg.get(m)! - 1);
      if (indeg.get(m) === 0) queue.push(m);
    }
  }

  if (result.length !== conceptIds.length) {
    const cycled = conceptIds.filter(c => !result.includes(c));
    throw new Error(`Cycle detected in concept graph: ${cycled.join(", ")}`);
  }
  return result;
}

export function dropCycles<E extends { from: string; to: string }>(
  edges: E[],
  conceptIds: string[]
): E[] {
  const kept: E[] = [];
  for (const e of edges) {
    const trial = [...kept, e];
    try {
      topoSort(conceptIds, trial);
      kept.push(e);
    } catch {
      // skip edge that would create a cycle
    }
  }
  return kept;
}
