import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy, Heart, ChevronRight } from "lucide-react";

interface LetterRescueWord {
  word: string;
  hint?: string;
  category?: string;
}

interface LetterRescueProps {
  words: LetterRescueWord[];
  title: string;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function LetterRescue({ words, title }: LetterRescueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [lives, setLives] = useState(6);
  const [wins, setWins] = useState(0);

  const currentWord = words[currentIndex];
  const isGameComplete = currentIndex >= words.length;

  const wordLetters = currentWord?.word.toUpperCase().split("") || [];
  const uniqueLetters = new Set(wordLetters.filter(l => l.match(/[A-Z]/)));
  
  const isWon = Array.from(uniqueLetters).every(letter => guessedLetters.has(letter));
  const isLost = lives <= 0;

  useEffect(() => {
    setGuessedLetters(new Set());
    setLives(6);
  }, [currentIndex]);

  const guessLetter = (letter: string) => {
    if (guessedLetters.has(letter) || isWon || isLost) return;
    
    const newGuessed = new Set(Array.from(guessedLetters).concat([letter]));
    setGuessedLetters(newGuessed);
    
    if (!uniqueLetters.has(letter)) {
      setLives(prev => prev - 1);
    }
  };

  const nextWord = () => {
    if (isWon) {
      setWins(prev => prev + 1);
    }
    setCurrentIndex(prev => prev + 1);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setGuessedLetters(new Set());
    setLives(6);
    setWins(0);
  };

  const getLetterStatus = (letter: string) => {
    if (!guessedLetters.has(letter)) return "unused";
    if (uniqueLetters.has(letter)) return "correct";
    return "wrong";
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Heart
                key={i}
                className={`h-5 w-5 ${i < lives ? "text-rose-500 fill-rose-500" : "text-muted"}`}
              />
            ))}
          </div>
          <span className="text-lg">Wins: <span className="font-bold text-primary">{wins}</span></span>
          <Button variant="outline" size="sm" onClick={resetGame} data-testid="button-reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isGameComplete ? (
        <Card className="p-6 max-w-2xl w-full">
          <div className="text-center mb-4">
            <span className="text-sm text-muted-foreground">
              Word {currentIndex + 1} of {words.length}
            </span>
            {currentWord.category && (
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-sm">
                {currentWord.category}
              </span>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {wordLetters.map((letter, index) => (
              <div
                key={index}
                className={`
                  w-10 h-12 md:w-12 md:h-14 flex items-center justify-center
                  border-b-4 border-primary text-2xl md:text-3xl font-bold
                  ${letter === " " ? "border-transparent w-4" : ""}
                `}
              >
                {letter === " " ? "" : (
                  guessedLetters.has(letter) || isWon || isLost ? letter : "_"
                )}
              </div>
            ))}
          </div>

          {currentWord.hint && !isWon && !isLost && guessedLetters.size > 2 && (
            <div className="p-3 bg-amber-500/10 rounded-lg mb-4 text-center">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Hint: {currentWord.hint}
              </p>
            </div>
          )}

          {!isWon && !isLost && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {ALPHABET.map(letter => {
                const status = getLetterStatus(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => guessLetter(letter)}
                    disabled={guessedLetters.has(letter)}
                    className={`
                      w-8 h-10 md:w-10 md:h-12 rounded-lg font-bold text-lg
                      transition-all
                      ${status === "unused" 
                        ? "bg-muted hover:bg-primary hover:text-primary-foreground" 
                        : status === "correct"
                          ? "bg-emerald-500 text-white"
                          : "bg-rose-500/30 text-rose-500"
                      }
                    `}
                    data-testid={`letter-${letter}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          )}

          {(isWon || isLost) && (
            <div className={`p-4 rounded-lg text-center mb-4 ${isWon ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
              <p className={`font-bold text-lg ${isWon ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {isWon ? "You got it!" : "Out of lives!"}
              </p>
              {isLost && (
                <p className="text-muted-foreground mt-1">
                  The word was: <span className="font-bold">{currentWord.word.toUpperCase()}</span>
                </p>
              )}
              <Button onClick={nextWord} className="mt-4" data-testid="button-next">
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
          <p className="text-xl mb-4">
            You rescued <span className="font-bold text-primary">{wins}</span> out of <span className="font-bold">{words.length}</span> words!
          </p>
          <Button onClick={resetGame} size="lg" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
