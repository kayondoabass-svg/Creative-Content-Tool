import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, RotateCcw, Trophy, ChevronRight } from "lucide-react";

interface Statement {
  statement: string;
  isTrue: boolean;
  explanation?: string;
}

interface FactOrFibProps {
  statements: Statement[];
  title: string;
}

export function FactOrFib({ statements, title }: FactOrFibProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentStatement = statements[currentIndex];
  const isGameComplete = currentIndex >= statements.length;

  const handleAnswer = (answer: boolean) => {
    if (answered) return;
    setSelectedAnswer(answer);
    setAnswered(true);
    
    if (answer === currentStatement.isTrue) {
      setScore(prev => prev + 1);
    }
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setCurrentIndex(prev => prev + 1);
    setAnswered(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setAnswered(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const isCorrect = selectedAnswer === currentStatement?.isTrue;

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-lg">Score: <span className="font-bold text-primary">{score}/{statements.length}</span></span>
          <Button variant="outline" size="sm" onClick={resetGame} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </div>
      </div>

      {!isGameComplete ? (
        <Card className="p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <span className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {statements.length}
            </span>
          </div>
          
          <h3 className="text-xl md:text-2xl font-medium text-center mb-8">
            "{currentStatement.statement}"
          </h3>

          <div className="flex gap-4 justify-center mb-6">
            <Button
              size="lg"
              variant={answered && selectedAnswer === true ? (isCorrect ? "default" : "destructive") : "outline"}
              className={`flex-1 max-w-[150px] h-16 text-lg ${!answered ? "hover:bg-emerald-500 hover:text-white" : ""}`}
              onClick={() => handleAnswer(true)}
              disabled={answered}
              data-testid="button-fact"
            >
              <Check className="h-6 w-6 mr-2" /> FACT
            </Button>
            <Button
              size="lg"
              variant={answered && selectedAnswer === false ? (isCorrect ? "default" : "destructive") : "outline"}
              className={`flex-1 max-w-[150px] h-16 text-lg ${!answered ? "hover:bg-rose-500 hover:text-white" : ""}`}
              onClick={() => handleAnswer(false)}
              disabled={answered}
              data-testid="button-fib"
            >
              <X className="h-6 w-6 mr-2" /> FIB
            </Button>
          </div>

          {showExplanation && (
            <div className={`p-4 rounded-lg mb-4 animate-in fade-in ${isCorrect ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-rose-500/10 border border-rose-500/30"}`}>
              <p className={`font-bold mb-2 ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {isCorrect ? "Correct!" : "Incorrect!"} This statement is {currentStatement.isTrue ? "TRUE" : "FALSE"}.
              </p>
              {currentStatement.explanation && (
                <p className="text-muted-foreground">{currentStatement.explanation}</p>
              )}
            </div>
          )}

          {answered && (
            <Button onClick={nextQuestion} className="w-full" data-testid="button-next">
              {currentIndex < statements.length - 1 ? (
                <>Next Question <ChevronRight className="h-4 w-4 ml-2" /></>
              ) : (
                "See Results"
              )}
            </Button>
          )}
        </Card>
      ) : (
        <Card className="p-8 text-center bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30 animate-in fade-in zoom-in">
          <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Game Complete!</h3>
          <p className="text-xl mb-4">
            You scored <span className="font-bold text-primary">{score}</span> out of <span className="font-bold">{statements.length}</span>
          </p>
          <p className="text-muted-foreground mb-6">
            {score === statements.length ? "Perfect score! Amazing!" :
             score >= statements.length * 0.8 ? "Great job!" :
             score >= statements.length * 0.6 ? "Good effort!" :
             "Keep practicing!"}
          </p>
          <Button onClick={resetGame} size="lg" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
