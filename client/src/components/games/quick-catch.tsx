import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy, Clock } from "lucide-react";

interface QuickCatchItem {
  text: string;
  isCorrect: boolean;
}

interface QuickCatchProps {
  correctItems: string[];
  incorrectItems: string[];
  title: string;
  instruction?: string;
}

interface ActiveItem {
  id: number;
  text: string;
  isCorrect: boolean;
  x: number;
  y: number;
  caught: boolean;
}

export function QuickCatch({ correctItems, incorrectItems, title, instruction }: QuickCatchProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [activeItems, setActiveItems] = useState<ActiveItem[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            setGameOver(true);
            if (score > highScore) {
              setHighScore(score);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score, highScore]);

  useEffect(() => {
    let spawner: NodeJS.Timeout;
    if (isPlaying) {
      const spawnItem = () => {
        const allItems = [
          ...correctItems.map(text => ({ text, isCorrect: true })),
          ...incorrectItems.map(text => ({ text, isCorrect: false })),
        ];
        const item = allItems[Math.floor(Math.random() * allItems.length)];
        
        setActiveItems(prev => [...prev.slice(-8), {
          id: idCounter.current++,
          text: item.text,
          isCorrect: item.isCorrect,
          x: 10 + Math.random() * 70,
          y: 10 + Math.random() * 60,
          caught: false,
        }]);
      };
      
      spawner = setInterval(spawnItem, 1200);
      spawnItem();
    }
    return () => clearInterval(spawner);
  }, [isPlaying, correctItems, incorrectItems]);

  const catchItem = (item: ActiveItem) => {
    if (item.caught) return;
    
    setActiveItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, caught: true } : i
    ));
    
    if (item.isCorrect) {
      setScore(prev => prev + 10);
    } else {
      setScore(prev => Math.max(0, prev - 5));
    }
    
    setTimeout(() => {
      setActiveItems(prev => prev.filter(i => i.id !== item.id));
    }, 300);
  };

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(30);
    setActiveItems([]);
    setGameOver(false);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setScore(0);
    setTimeLeft(30);
    setActiveItems([]);
    setGameOver(false);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          {isPlaying && (
            <>
              <div className="flex items-center gap-1 text-lg">
                <Clock className="h-5 w-5" />
                <span className={`font-bold ${timeLeft <= 10 ? "text-rose-500" : ""}`}>{timeLeft}s</span>
              </div>
              <span className="text-lg">Score: <span className="font-bold text-primary">{score}</span></span>
            </>
          )}
          <Button variant="outline" size="sm" onClick={resetGame} data-testid="button-reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isPlaying && !gameOver && (
        <Card className="p-8 text-center max-w-md">
          <h3 className="text-xl font-bold mb-4">How to Play</h3>
          <p className="text-muted-foreground mb-4">
            {instruction || `Tap on the correct items! Catch "${correctItems[0]}" and similar items, avoid the wrong ones.`}
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <span className="text-sm">Catch:</span>
            {correctItems.slice(0, 3).map((item, i) => (
              <span key={i} className="px-2 py-1 bg-emerald-500/20 text-emerald-600 rounded text-sm">
                {item}
              </span>
            ))}
          </div>
          <Button size="lg" onClick={startGame} data-testid="button-start">
            Start Game!
          </Button>
        </Card>
      )}

      {isPlaying && (
        <div 
          ref={containerRef}
          className="relative w-full max-w-2xl h-[400px] bg-gradient-to-b from-sky-100 to-emerald-100 dark:from-sky-900/30 dark:to-emerald-900/30 rounded-xl overflow-hidden"
        >
          {activeItems.map(item => (
            <button
              key={item.id}
              onClick={() => catchItem(item)}
              className={`
                absolute px-4 py-2 rounded-full font-medium
                transition-all duration-200 transform
                ${item.caught 
                  ? "scale-0 opacity-0" 
                  : "hover:scale-110 cursor-pointer animate-pulse"
                }
                ${item.isCorrect 
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-600 text-white shadow-lg" 
                  : "bg-gradient-to-r from-rose-400 to-rose-600 text-white shadow-lg"
                }
              `}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
              }}
              data-testid={`item-${item.id}`}
            >
              {item.text}
            </button>
          ))}
        </div>
      )}

      {gameOver && (
        <Card className="p-8 text-center bg-gradient-to-r from-primary/10 to-accent/10 animate-in fade-in zoom-in">
          <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Time's Up!</h3>
          <p className="text-3xl font-bold text-primary mb-2">{score} points</p>
          {score >= highScore && score > 0 && (
            <p className="text-amber-500 font-medium mb-2">New High Score!</p>
          )}
          <p className="text-muted-foreground mb-4">High Score: {highScore}</p>
          <Button onClick={startGame} size="lg" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
