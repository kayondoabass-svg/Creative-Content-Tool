import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RotateCcw, Trophy, ChevronRight, Check, X } from "lucide-react";

interface FillBlank {
  sentence: string;
  blank: string;
  hint?: string;
}

interface MissingPieceProps {
  blanks: FillBlank[];
  title: string;
}

export function MissingPiece({ blanks, title }: MissingPieceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const currentBlank = blanks[currentIndex];
  const isGameComplete = currentIndex >= blanks.length;

  const checkAnswer = () => {
    const correct = answer.toLowerCase().trim() === currentBlank.blank.toLowerCase().trim();
    setIsCorrect(correct);
    setIsChecked(true);
    if (correct) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    setCurrentIndex(prev => prev + 1);
    setAnswer("");
    setIsChecked(false);
    setIsCorrect(false);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setAnswer("");
    setIsChecked(false);
    setIsCorrect(false);
  };

  const renderSentence = () => {
    const parts = currentBlank.sentence.split("_____");
    return (
      <p className="text-xl md:text-2xl leading-relaxed">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <span className="inline-block mx-2 px-4 py-1 min-w-[100px] border-b-4 border-primary bg-primary/5 rounded text-center font-bold">
                {isChecked ? currentBlank.blank : (answer || "?")}
              </span>
            )}
          </span>
        ))}
      </p>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-lg">Score: <span className="font-bold text-primary">{score}/{blanks.length}</span></span>
          <Button variant="outline" size="sm" onClick={resetGame} data-testid="button-reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isGameComplete ? (
        <Card className="p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <span className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {blanks.length}
            </span>
          </div>

          <div className="mb-8 text-center">
            {renderSentence()}
          </div>

          {currentBlank.hint && !isChecked && (
            <div className="p-3 bg-muted rounded-lg mb-4 text-center">
              <p className="text-sm text-muted-foreground">Hint: {currentBlank.hint}</p>
            </div>
          )}

          {!isChecked ? (
            <div className="space-y-4">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type the missing word..."
                className="text-center text-lg"
                onKeyDown={(e) => e.key === "Enter" && answer && checkAnswer()}
                data-testid="input-answer"
              />
              <Button 
                onClick={checkAnswer} 
                className="w-full" 
                disabled={!answer}
                data-testid="button-check"
              >
                Check Answer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg flex items-center justify-center gap-3 ${isCorrect ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                {isCorrect ? (
                  <>
                    <Check className="h-6 w-6 text-emerald-500" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Correct!</span>
                  </>
                ) : (
                  <>
                    <X className="h-6 w-6 text-rose-500" />
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      The answer was: {currentBlank.blank}
                    </span>
                  </>
                )}
              </div>
              <Button onClick={nextQuestion} className="w-full" data-testid="button-next">
                {currentIndex < blanks.length - 1 ? (
                  <>Next <ChevronRight className="h-4 w-4 ml-2" /></>
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
            You got <span className="font-bold text-primary">{score}</span> out of <span className="font-bold">{blanks.length}</span> correct!
          </p>
          <Button onClick={resetGame} size="lg" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
