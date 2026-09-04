export function rankEntries<T extends { score: number }>(entries: T[]) {
  let rank = 0;
  let previousScore: number | undefined;

  return [...entries]
    .sort((a, b) => b.score - a.score)
    .map((entry) => {
      if (entry.score !== previousScore) {
        rank += 1;
        previousScore = entry.score;
      }

      return { ...entry, rank };
    });
}
