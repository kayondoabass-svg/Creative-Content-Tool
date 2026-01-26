import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift, RotateCcw, Check, X } from "lucide-react";

interface MysteryBoxItem {
  number: number;
  question: string;
  answer: string;
  points?: number;
}

interface MysteryBoxProps {
  boxes: MysteryBoxItem[];
  title: string;
}

export function MysteryBox({ boxes, title }: MysteryBoxProps) {
  const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
  const [selectedBox, setSelectedBox] = useState<MysteryBoxItem | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);

  const openBox = (box: MysteryBoxItem) => {
    if (openedBoxes.has(box.number)) return;
    setSelectedBox(box);
    setShowAnswer(false);
  };

  const revealAnswer = () => {
    setShowAnswer(true);
  };

  const markCorrect = () => {
    if (selectedBox) {
      setOpenedBoxes(prev => new Set(Array.from(prev).concat([selectedBox.number])));
      setScore(prev => prev + (selectedBox.points || 10));
      setSelectedBox(null);
      setShowAnswer(false);
    }
  };

  const markIncorrect = () => {
    if (selectedBox) {
      setOpenedBoxes(prev => new Set(Array.from(prev).concat([selectedBox.number])));
      setSelectedBox(null);
      setShowAnswer(false);
    }
  };

  const resetGame = () => {
    setOpenedBoxes(new Set());
    setSelectedBox(null);
    setShowAnswer(false);
    setScore(0);
  };

  const colors = [
    "from-purple-500 to-purple-700",
    "from-cyan-500 to-cyan-700",
    "from-emerald-500 to-emerald-700",
    "from-amber-500 to-amber-700",
    "from-rose-500 to-rose-700",
    "from-pink-500 to-pink-700",
    "from-indigo-500 to-indigo-700",
    "from-teal-500 to-teal-700",
  ];

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">Score: <span className="text-primary">{score}</span></span>
          <Button variant="outline" size="sm" onClick={resetGame} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 max-w-2xl">
        {boxes.map((box, index) => {
          const isOpened = openedBoxes.has(box.number);
          return (
            <button
              key={box.number}
              onClick={() => openBox(box)}
              disabled={isOpened}
              className={`
                relative w-20 h-20 md:w-24 md:h-24 rounded-xl 
                transition-all duration-300 transform
                ${isOpened 
                  ? "bg-muted opacity-50 cursor-not-allowed" 
                  : `bg-gradient-to-br ${colors[index % colors.length]} hover:scale-105 hover:shadow-lg cursor-pointer`
                }
              `}
              data-testid={`box-${box.number}`}
            >
              {isOpened ? (
                <Check className="h-8 w-8 text-muted-foreground mx-auto" />
              ) : (
                <>
                  <Gift className="h-8 w-8 text-white mx-auto mb-1" />
                  <span className="text-white font-bold text-lg">{box.number}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {selectedBox && (
        <Card className="p-6 max-w-lg w-full animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              Box #{selectedBox.number}
            </span>
            <h3 className="text-xl font-bold mb-4">{selectedBox.question}</h3>
            
            {!showAnswer ? (
              <Button onClick={revealAnswer} className="w-full" data-testid="button-reveal">
                Reveal Answer
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-accent/10 rounded-lg">
                  <p className="text-lg font-medium text-accent">{selectedBox.answer}</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={markCorrect} className="flex-1" data-testid="button-correct">
                    <Check className="h-4 w-4 mr-2" /> Correct (+{selectedBox.points || 10})
                  </Button>
                  <Button variant="outline" onClick={markIncorrect} className="flex-1" data-testid="button-incorrect">
                    <X className="h-4 w-4 mr-2" /> Incorrect
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {openedBoxes.size === boxes.length && boxes.length > 0 && (
        <Card className="p-6 text-center bg-gradient-to-r from-primary/10 to-accent/10">
          <h3 className="text-2xl font-bold mb-2">Game Complete!</h3>
          <p className="text-lg">Final Score: <span className="text-primary font-bold">{score}</span> points</p>
          <Button onClick={resetGame} className="mt-4" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
