import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy, Check } from "lucide-react";

interface WordHuntProps {
  words: string[];
  title: string;
  gridSize?: number;
}

type CellPosition = { row: number; col: number };

export function WordHunt({ words, title, gridSize = 10 }: WordHuntProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [wordPositions, setWordPositions] = useState<Map<string, CellPosition[]>>(new Map());
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    generateGrid();
  }, [words]);

  const generateGrid = () => {
    const newGrid: string[][] = Array(gridSize).fill(null).map(() => 
      Array(gridSize).fill("").map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
    );
    
    const positions = new Map<string, CellPosition[]>();
    
    words.forEach(word => {
      const upperWord = word.toUpperCase();
      const placed = placeWord(newGrid, upperWord);
      if (placed) {
        positions.set(upperWord, placed);
      }
    });
    
    setGrid(newGrid);
    setWordPositions(positions);
    setFoundWords(new Set());
    setSelectedCells([]);
  };

  const placeWord = (grid: string[][], word: string): CellPosition[] | null => {
    const directions = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: -1, dc: 1 },
    ];
    
    for (let attempt = 0; attempt < 100; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startRow = Math.floor(Math.random() * gridSize);
      const startCol = Math.floor(Math.random() * gridSize);
      
      const endRow = startRow + dir.dr * (word.length - 1);
      const endCol = startCol + dir.dc * (word.length - 1);
      
      if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) continue;
      
      let canPlace = true;
      const positions: CellPosition[] = [];
      
      for (let i = 0; i < word.length; i++) {
        const row = startRow + dir.dr * i;
        const col = startCol + dir.dc * i;
        const currentChar = grid[row][col];
        
        if (currentChar !== word[i] && currentChar.match(/[A-Z]/) && word[i] !== currentChar) {
          if (Math.random() > 0.3) {
            canPlace = false;
            break;
          }
        }
        positions.push({ row, col });
      }
      
      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          const row = startRow + dir.dr * i;
          const col = startCol + dir.dc * i;
          grid[row][col] = word[i];
        }
        return positions;
      }
    }
    return null;
  };

  const handleCellClick = (row: number, col: number) => {
    const pos = { row, col };
    const existing = selectedCells.findIndex(c => c.row === row && c.col === col);
    
    if (existing !== -1) {
      setSelectedCells(selectedCells.slice(0, existing));
    } else {
      setSelectedCells([...selectedCells, pos]);
    }
  };

  const checkSelection = () => {
    const selectedWord = selectedCells.map(c => grid[c.row][c.col]).join("");
    
    const entries = Array.from(wordPositions.entries());
    for (const [word, positions] of entries) {
      if (word === selectedWord && !foundWords.has(word)) {
        setFoundWords(prev => new Set(Array.from(prev).concat([word])));
        break;
      }
    }
    setSelectedCells([]);
  };

  const isCellSelected = (row: number, col: number) => 
    selectedCells.some(c => c.row === row && c.col === col);

  const isCellFound = (row: number, col: number) => {
    const entries = Array.from(wordPositions.entries());
    for (const [word, positions] of entries) {
      if (foundWords.has(word) && positions.some(p => p.row === row && p.col === col)) {
        return true;
      }
    }
    return false;
  };

  const isGameComplete = foundWords.size === words.length && words.length > 0;

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-3xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-lg">Found: <span className="font-bold text-primary">{foundWords.size}/{words.length}</span></span>
          <Button variant="outline" size="sm" onClick={generateGrid} data-testid="button-reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Card className="p-4">
          <h3 className="font-bold mb-3 text-center">Find These Words:</h3>
          <div className="flex flex-wrap gap-2 max-w-[200px]">
            {words.map((word, index) => (
              <span
                key={index}
                className={`px-2 py-1 rounded text-sm ${
                  foundWords.has(word.toUpperCase())
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 line-through"
                    : "bg-muted"
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        </Card>

        <div className="flex flex-col items-center gap-3">
          <div 
            className="grid gap-0.5 bg-muted p-2 rounded-lg"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {grid.map((row, rowIndex) => 
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  className={`
                    w-7 h-7 md:w-8 md:h-8 flex items-center justify-center
                    text-sm md:text-base font-bold rounded
                    transition-colors
                    ${isCellFound(rowIndex, colIndex)
                      ? "bg-emerald-500 text-white"
                      : isCellSelected(rowIndex, colIndex)
                        ? "bg-primary text-primary-foreground"
                        : "bg-card hover:bg-accent"
                    }
                  `}
                  data-testid={`cell-${rowIndex}-${colIndex}`}
                >
                  {cell}
                </button>
              ))
            )}
          </div>
          
          {selectedCells.length > 0 && (
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-primary/10 rounded font-mono">
                {selectedCells.map(c => grid[c.row][c.col]).join("")}
              </span>
              <Button size="sm" onClick={checkSelection} data-testid="button-check">
                <Check className="h-4 w-4 mr-1" /> Check
              </Button>
            </div>
          )}
        </div>
      </div>

      {isGameComplete && (
        <Card className="p-8 text-center bg-gradient-to-r from-primary/10 to-accent/10 animate-in fade-in zoom-in">
          <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">All Words Found!</h3>
          <p className="text-muted-foreground mb-4">You found all {words.length} words!</p>
          <Button onClick={generateGrid} size="lg" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
