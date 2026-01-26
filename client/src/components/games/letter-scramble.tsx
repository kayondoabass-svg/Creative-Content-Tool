import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RotateCcw, Trophy, ChevronRight, Lightbulb, Shuffle } from "lucide-react";

interface ScrambleWord {
  word: string;
  hint?: string;
  points?: number;
}

interface LetterScrambleProps {
  words: ScrambleWord[];
  title: string;
}

function scrambleWord(word: string): string {
  const letters = word.toUpperCase().split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.join("") === word.toUpperCase()) {
    return scrambleWord(word);
  }
  return letters.join("");
}

export function LetterScramble({ words, title }: LetterScrambleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrambled, setScrambled] = useState("");
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  const currentWord = words[currentIndex];
  const isGameComplete = currentIndex >= words.length;

  useEffect(() => {
    if (currentWord) {
      setScrambled(scrambleWord(currentWord.word));
    }
  }, [currentIndex]);

  const reshuffleLetters = () => {
    if (currentWord) {
      setScrambled(scrambleWord(currentWord.word));
    }
  };

  const checkAnswer = () => {
    const correct = guess.toLowerCase().trim() === currentWord.word.toLowerCase();
    setIsCorrect(correct);
    
    if (correct) {
      const points = currentWord.points || 10;
      const hintPenalty = showHint ? Math.floor(points * 0.5) : 0;
      setScore(prev => prev + points - hintPenalty);
    }
  };

  const nextWord = () => {
    setCurrentIndex(prev => prev + 1);
    setGuess("");
    setShowHint(false);
    setIsCorrect(null);
  };

  const useHint = () => {
    setShowHint(true);
    setHintsUsed(prev => prev + 1);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setGuess("");
    setShowHint(false);
    setIsCorrect(null);
    setHintsUsed(0);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-lg">Score: <span className="font-bold text-primary">{score}</span></span>
          <Button variant="outline" size="sm" onClick={resetGame} data-testid="button-reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isGameComplete ? (
        <Card className="p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <span className="text-sm text-muted-foreground">
              Word {currentIndex + 1} of {words.length}
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {scrambled.split("").map((letter, index) => (
              <div
                key={index}
                className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg"
              >
                {letter}
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-4">
            <Button variant="ghost" size="sm" onClick={reshuffleLetters} data-testid="button-shuffle">
              <Shuffle className="h-4 w-4 mr-2" /> Shuffle
            </Button>
          </div>

          {showHint && currentWord.hint && (
            <div className="p-3 bg-amber-500/10 rounded-lg mb-4 text-center">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <Lightbulb className="h-4 w-4 inline mr-2" />
                Hint: {currentWord.hint}
              </p>
            </div>
          )}

          {isCorrect === null ? (
            <div className="space-y-4">
              <Input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your answer..."
                className="text-center text-lg"
                onKeyDown={(e) => e.key === "Enter" && guess && checkAnswer()}
                data-testid="input-guess"
              />
              <div className="flex gap-3">
                {currentWord.hint && !showHint && (
                  <Button variant="outline" onClick={useHint} className="flex-1" data-testid="button-hint">
                    <Lightbulb className="h-4 w-4 mr-2" /> Use Hint (-50%)
                  </Button>
                )}
                <Button 
                  onClick={checkAnswer} 
                  className="flex-1" 
                  disabled={!guess}
                  data-testid="button-check"
                >
                  Check Answer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg text-center ${isCorrect ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                <p className={`font-bold text-lg ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {isCorrect ? "Correct!" : "Not quite!"}
                </p>
                <p className="text-muted-foreground mt-1">
                  The word was: <span className="font-bold">{currentWord.word.toUpperCase()}</span>
                </p>
              </div>
              <Button onClick={nextWord} className="w-full" data-testid="button-next">
                {currentIndex < words.length - 1 ? (
                  <>Next Word <ChevronRight className="h-4 w-4 ml-2" /></>
                ) : (
                  "See Results"
                )}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-8 text-center bg-gradient-to-r from-primary/10 to-accent/10 animate-in fade-in zoom-in">
          <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Game Complete!</h3>
          <p className="text-3xl font-bold text-primary mb-2">{score} points</p>
          <p className="text-sm text-muted-foreground mb-6">
            Hints used: {hintsUsed}
          </p>
          <Button onClick={resetGame} size="lg" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
