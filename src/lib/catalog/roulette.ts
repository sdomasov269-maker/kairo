export type RandomSource = () => number;

export function fisherYates<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export interface RouletteBag {
  next(currentId?: string): string | null;
  recent(): readonly string[];
}

export function createRouletteBag(
  sourceIds: readonly string[],
  random: RandomSource = Math.random,
  recentLimit = 50,
): RouletteBag {
  const ids = [...new Set(sourceIds)];
  let bag = fisherYates(ids, random);
  let recentIds: string[] = [];

  const refill = () => {
    bag = fisherYates(ids, random);
  };

  return {
    next(currentId) {
      if (!ids.length) return null;
      if (ids.length === 1) return ids[0];
      if (!bag.length) refill();

      let index = bag.findIndex(
        (id) => id !== currentId && !recentIds.includes(id),
      );
      if (index < 0) index = bag.findIndex((id) => id !== currentId);
      if (index < 0) {
        refill();
        index = bag.findIndex((id) => id !== currentId);
      }
      if (index < 0) return null;

      const [winner] = bag.splice(index, 1);
      recentIds = [...recentIds, winner].slice(-recentLimit);
      return winner;
    },
    recent: () => recentIds,
  };
}

export function uniqueVisibleIds(
  ids: readonly string[],
  center: number,
  radius: number,
): string[] {
  const visible: string[] = [];
  const used = new Set<string>();
  for (let index = center - radius; index <= center + radius; index += 1) {
    const id = ids[index];
    if (id === undefined || used.has(id)) continue;
    used.add(id);
    visible.push(id);
  }
  return visible;
}
