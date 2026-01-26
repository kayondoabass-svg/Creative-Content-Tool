import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy, ChevronRight, Zap } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  points?: number;
  explanation?: string;
}

interface BrainBattleProps {
  questions: QuizQuestion[];
  title: string;
}

export function BrainBattle({ questions, title }: BrainBattleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(0);

  const currentQuestion = questions[currentIndex];
  const isGameComplete = currentIndex >= questions.length;

  const handleSelect = (optionIndex: number) => {
    if (showResult) return;
    setSelectedOption(optionIndex);
  };

  const submitAnswer = () => {
    if (selectedOption === null) return;
    setShowResult(true);
    
    if (selectedOption === currentQuestion.correctIndex) {
      const points = currentQuestion.points || 10;
      const streakBonus = streak >= 3 ? Math.floor(points * 0.5) : 0;
      setScore(prev => prev + points + streakBonus);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    setCurrentIndex(prev => prev + 1);
    setSelectedOption(null);
    setShowResult(false);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowResult(false);
    setStreak(0);
  };

  const isCorrect = selectedOption === currentQuestion?.correctIndex;
  const optionColors = ["bg-purple-500", "bg-cyan-500", "bg-emerald-500", "bg-amber-500"];

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <span className="font-bold">{streak}</span>
          </div>
          <span className="text-lg">Score: <span className="font-bold text-primary">{score}</span></span>
          <Button variant="outline" size="sm" onClick={resetGame} data-testid="button-reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {streak >= 3 && !isGameComplete && (
        <div className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full animate-pulse">
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Streak Bonus Active! +50% points
          </span>
        </div>
      )}

      {!isGameComplete ? (
        <Card className="p-6 max-w-2xl w-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-primary">
              {currentQuestion.points || 10} points
            </span>
          </div>
          
          <h3 className="text-xl font-medium mb-6">{currentQuestion.question}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrectOption = index === currentQuestion.correctIndex;
              
              let buttonClass = "";
              if (showResult) {
                if (isCorrectOption) {
                  buttonClass = "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-500";
                } else if (isSelected && !isCorrectOption) {
                  buttonClass = "bg-rose-500 text-white border-rose-500 hover:bg-rose-500";
                }
              } else if (isSelected) {
                buttonClass = `${optionColors[index % 4]} text-white`;
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-auto min-h-[60px] p-4 text-left justify-start whitespace-normal ${buttonClass}`}
                  onClick={() => handleSelect(index)}
                  disabled={showResult}
                  data-testid={`option-${index}`}
                >
                  <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </Button>
              );
            })}
          </div>

          {showResult && currentQuestion.explanation && (
            <div className={`p-4 rounded-lg mb-4 ${isCorrect ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
              <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
            </div>
          )}

          {!showResult ? (
            <Button 
              onClick={submitAnswer} 
              className="w-full" 
              disabled={selectedOption === null}
              data-testid="button-submit"
            >
              Submit Answer
            </Button>
          ) : (
            <Button onClick={nextQuestion} className="w-full" data-testid="button-next">
              {currentIndex < questions.length - 1 ? (
                <>Next Question <ChevronRight className="h-4 w-4 ml-2" /></>
              ) : (
                "See Results"
              )}
            </Button>
          )}
        </Card>
      ) : (
        <Card className="p-8 text-center bg-gradient-to-r from-primary/10 to-accent/10 animate-in fade-in zoom-in">
          <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Brain Battle Complete!</h3>
          <p className="text-3xl font-bold text-primary mb-4">{score} points</p>
          <p className="text-muted-foreground mb-6">
            {score >= questions.length * 10 ? "Perfect game! You're a genius!" :
             score >= questions.length * 7 ? "Excellent performance!" :
             score >= questions.length * 5 ? "Good job!" :
             "Keep learning and try again!"}
          </p>
          <Button onClick={resetGame} size="lg" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
