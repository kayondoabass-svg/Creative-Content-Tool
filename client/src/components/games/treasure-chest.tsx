import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy, Check, X, Gem } from "lucide-react";

interface TreasureItem {
  id: number;
  challenge: string;
  reward: string;
  points?: number;
}

interface TreasureChestProps {
  chests: TreasureItem[];
  title: string;
}

export function TreasureChest({ chests, title }: TreasureChestProps) {
  const [openedChests, setOpenedChests] = useState<Set<number>>(new Set());
  const [selectedChest, setSelectedChest] = useState<TreasureItem | null>(null);
  const [showChallenge, setShowChallenge] = useState(true);
  const [score, setScore] = useState(0);

  const openChest = (chest: TreasureItem) => {
    if (openedChests.has(chest.id)) return;
    setSelectedChest(chest);
    setShowChallenge(true);
  };

  const completeChallenge = (success: boolean) => {
    if (selectedChest) {
      setOpenedChests(prev => new Set(Array.from(prev).concat([selectedChest.id])));
      if (success) {
        setScore(prev => prev + (selectedChest.points || 10));
      }
      setShowChallenge(false);
    }
  };

  const closeModal = () => {
    setSelectedChest(null);
    setShowChallenge(true);
  };

  const resetGame = () => {
    setOpenedChests(new Set());
    setSelectedChest(null);
    setShowChallenge(true);
    setScore(0);
  };

  const isGameComplete = openedChests.size === chests.length && chests.length > 0;

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-3xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-primary">{score}</span>
          </div>
          <Button variant="outline" size="sm" onClick={resetGame} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl">
        {chests.map((chest) => {
          const isOpened = openedChests.has(chest.id);
          return (
            <button
              key={chest.id}
              onClick={() => openChest(chest)}
              disabled={isOpened}
              className={`
                relative w-28 h-24 md:w-36 md:h-28 rounded-xl 
                transition-all duration-300 transform
                ${isOpened 
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:scale-105 hover:shadow-xl cursor-pointer"
                }
              `}
              data-testid={`chest-${chest.id}`}
            >
              <div className={`
                w-full h-full rounded-xl overflow-hidden
                ${isOpened 
                  ? "bg-muted" 
                  : "bg-gradient-to-br from-amber-600 to-amber-800"
                }
              `}>
                {!isOpened && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-12 h-8 bg-amber-900 rounded-t-lg" />
                    <div className="w-16 h-12 bg-amber-700 rounded-b-lg relative">
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 rounded-full" />
                    </div>
                    <span className="text-white text-xs mt-1 font-medium">#{chest.id}</span>
                  </div>
                )}
                {isOpened && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedChest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <Card 
            className="p-6 max-w-md w-full animate-in fade-in zoom-in" 
            onClick={(e) => e.stopPropagation()}
          >
            {showChallenge ? (
              <>
                <div className="text-center mb-6">
                  <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-sm font-medium mb-4">
                    Treasure Chest #{selectedChest.id}
                  </span>
                  <h3 className="text-xl font-bold">Challenge!</h3>
                </div>
                <p className="text-lg text-center mb-6">{selectedChest.challenge}</p>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => completeChallenge(false)} 
                    className="flex-1"
                    data-testid="button-fail"
                  >
                    <X className="h-4 w-4 mr-2" /> Failed
                  </Button>
                  <Button 
                    onClick={() => completeChallenge(true)} 
                    className="flex-1"
                    data-testid="button-success"
                  >
                    <Check className="h-4 w-4 mr-2" /> Completed!
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <Gem className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Treasure Found!</h3>
                  <p className="text-lg text-primary mb-4">{selectedChest.reward}</p>
                  <p className="text-muted-foreground mb-4">+{selectedChest.points || 10} points</p>
                  <Button onClick={closeModal} data-testid="button-close">
                    Continue
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {isGameComplete && (
        <Card className="p-8 text-center bg-gradient-to-r from-amber-500/10 to-yellow-500/10 animate-in fade-in zoom-in">
          <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">All Treasures Found!</h3>
          <p className="text-3xl font-bold text-primary mb-4">{score} points</p>
          <Button onClick={resetGame} size="lg" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
