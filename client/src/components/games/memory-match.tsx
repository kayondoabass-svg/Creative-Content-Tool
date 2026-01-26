import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy } from "lucide-react";

interface MemoryPair {
  term: string;
  match: string;
}

interface MemoryMatchProps {
  pairs: MemoryPair[];
  title: string;
}

interface MemoryCard {
  id: number;
  content: string;
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
}

export function MemoryMatch({ pairs, title }: MemoryMatchProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    initializeGame();
  }, [pairs]);

  const initializeGame = () => {
    const gameCards: MemoryCard[] = [];
    pairs.forEach((pair, index) => {
      gameCards.push({
        id: index * 2,
        content: pair.term,
        pairId: index,
        isFlipped: false,
        isMatched: false,
      });
      gameCards.push({
        id: index * 2 + 1,
        content: pair.match,
        pairId: index,
        isFlipped: false,
        isMatched: false,
      });
    });
    
    for (let i = gameCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gameCards[i], gameCards[j]] = [gameCards[j], gameCards[i]];
    }
    
    setCards(gameCards);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsChecking(false);
  };

  const flipCard = (cardId: number) => {
    if (isChecking) return;
    if (flippedCards.length >= 2) return;
    if (flippedCards.includes(cardId)) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isMatched) return;

    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsChecking(true);
      
      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.pairId === firstCard.pairId ? { ...c, isMatched: true } : c
          ));
          setMatchedPairs(prev => prev + 1);
          setFlippedCards([]);
          setIsChecking(false);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            newFlipped.includes(c.id) ? { ...c, isFlipped: false } : c
          ));
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  };

  const isGameComplete = matchedPairs === pairs.length && pairs.length > 0;
  const gridCols = cards.length <= 8 ? 4 : cards.length <= 12 ? 4 : 6;

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-3xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm">Moves: <span className="font-bold">{moves}</span></span>
          <span className="text-sm">Pairs: <span className="font-bold text-primary">{matchedPairs}/{pairs.length}</span></span>
          <Button variant="outline" size="sm" onClick={initializeGame} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </div>
      </div>

      <div 
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => flipCard(card.id)}
            disabled={card.isMatched || card.isFlipped}
            className={`
              relative w-20 h-24 md:w-24 md:h-28 rounded-xl 
              transition-all duration-300 transform-gpu
              ${card.isMatched 
                ? "bg-emerald-500/20 border-2 border-emerald-500" 
                : card.isFlipped
                  ? "bg-primary text-primary-foreground"
                  : "bg-gradient-to-br from-primary to-accent hover:scale-105 cursor-pointer"
              }
            `}
            style={{
              perspective: "1000px",
              transformStyle: "preserve-3d",
              transform: card.isFlipped || card.isMatched ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
            data-testid={`card-${card.id}`}
          >
            <div className="absolute inset-0 flex items-center justify-center p-2">
              {(card.isFlipped || card.isMatched) ? (
                <span 
                  className="text-xs md:text-sm font-medium text-center"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  {card.content}
                </span>
              ) : (
                <span className="text-2xl text-white">?</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {isGameComplete && (
        <Card className="p-6 text-center bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30 animate-in fade-in zoom-in">
          <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
          <p className="text-lg">You completed the game in <span className="font-bold text-primary">{moves}</span> moves!</p>
          <Button onClick={initializeGame} className="mt-4" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
