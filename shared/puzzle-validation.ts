/** Validate existing BrightBoard puzzle shapes; no generated lettering trusted. */
export function validateWordSearchPuzzle(data: any, requirePlacements = true) {
  if (!Array.isArray(data?.words) || data.words.length < 3 || data.words.length > 20 ||
      data.words.some((w: any) => typeof w !== "string" || !/^[A-Z]{2,20}$/.test(w)) ||
      new Set(data.words).size !== data.words.length) throw new Error("A puzzle needs 3–20 distinct target words of 2–20 letters.");
  const grid = data.grid;
  if (!Array.isArray(grid) || grid.length < 2 || grid.length > 30 ||
      !Array.isArray(grid[0]) || grid[0].length < 2 || grid[0].length > 30 ||
      grid.some((row: any) => !Array.isArray(row) || row.length !== grid[0].length ||
        row.some((c: any) => typeof c !== "string" || !/^[A-Z]$/.test(c)))) throw new Error("The puzzle grid is not a rectangular letter matrix.");
  const directions: Record<string, [number, number]> = {
    right: [0, 1], down: [1, 0], downRight: [1, 1], upRight: [-1, 1],
  };
  const spells = (word: string, row: number, col: number, dr: number, dc: number) =>
    Array.from(word).every((letter, i) => grid[row + dr * i]?.[col + dc * i] === letter);
  if (data.answerKey === undefined && !requirePlacements) {
    for (const word of data.words) {
      if (!grid.some((row: string[], r: number) => row.some((_c, c) =>
        Object.values(directions).some(([dr, dc]) => spells(word, r, c, dr, dc))))) {
        throw new Error(`Puzzle word ${word} is missing from the grid.`);
      }
    }
    return data;
  }
  if (!Array.isArray(data.answerKey) || data.answerKey.length !== data.words.length ||
      new Set(data.answerKey.map((p: any) => p?.word)).size !== data.words.length) throw new Error("Puzzle answer placements do not match its word bank.");
  for (const placement of data.answerKey) {
    if (!placement || !data.words.includes(placement.word) || !Number.isInteger(placement.row) || !Number.isInteger(placement.column) ||
        placement.row < 0 || placement.column < 0 || !Object.hasOwn(directions, placement.direction)) throw new Error("A puzzle answer placement is invalid.");
    const [dr, dc] = directions[placement.direction];
    if (!spells(placement.word, placement.row, placement.column, dr, dc)) throw new Error(`The grid does not spell ${placement.word} at its answer coordinates.`);
  }
  return data;
}
