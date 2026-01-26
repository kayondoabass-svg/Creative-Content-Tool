import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy, Check, X } from "lucide-react";

interface PopQuestion {
  question: string;
  answer: string;
  options?: string[];
}

interface PopAndLearnProps {
  questions: PopQuestion[];
  title: string;
}

interface Balloon {
  id: number;
  x: number;
  y: number;
  color: string;
  content: string;
  isCorrect: boolean;
  isPopped: boolean;
}

const COLORS = [
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-cyan-400 to-cyan-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
  "from-rose-400 to-rose-600",
];

export function PopAndLearn({ questions, title }: PopAndLearnProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: string } | null>(null);

  const currentQuestion = questions[currentIndex];
  const isGameComplete = currentIndex >= questions.length;

  useEffect(() => {
    if (currentQuestion) {
      generateBalloons();
    }
  }, [currentIndex]);

  const generateBalloons = () => {
    const options = currentQuestion.options || [
      currentQuestion.answer,
      `Wrong ${Math.random().toString(36).substring(7)}`,
      `Wrong ${Math.random().toString(36).substring(7)}`,
      `Wrong ${Math.random().toString(36).substring(7)}`,
    ];
    
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    const newBalloons: Balloon[] = shuffled.map((option, index) => ({
      id: index,
      x: 15 + (index % 2) * 50 + Math.random() * 20,
      y: 20 + Math.floor(index / 2) * 40 + Math.random() * 10,
      color: COLORS[index % COLORS.length],
      content: option,
      isCorrect: option === currentQuestion.answer,
      isPopped: false,
    }));
    setBalloons(newBalloons);
    setFeedback(null);
  };

  const popBalloon = (balloon: Balloon) => {
    if (feedback) return;
    
    setBalloons(prev => prev.map(b => 
      b.id === balloon.id ? { ...b, isPopped: true } : b
    ));
    
    setFeedback({
      correct: balloon.isCorrect,
      answer: currentQuestion.answer,
    });
    
    if (balloon.isCorrect) {
      setScore(prev => prev + 10);
    }
  };

  const nextQuestion = () => {
    setCurrentIndex(prev => prev + 1);
    setFeedback(null);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setFeedback(null);
    setBalloons([]);
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
        <>
          <Card className="p-4 text-center max-w-2xl w-full">
            <span className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <h3 className="text-xl font-medium mt-2">{currentQuestion.question}</h3>
          </Card>

          <div className="relative w-full max-w-2xl h-[300px] bg-gradient-to-b from-sky-100 to-sky-200 dark:from-sky-900/30 dark:to-sky-800/30 rounded-xl overflow-hidden">
            {balloons.map((balloon) => (
              <button
                key={balloon.id}
                onClick={() => popBalloon(balloon)}
                disabled={balloon.isPopped || !!feedback}
                className={`
                  absolute transition-all duration-300 transform
                  ${balloon.isPopped ? "scale-0 opacity-0" : "hover:scale-110 cursor-pointer animate-bounce"}
                `}
                style={{
                  left: `${balloon.x}%`,
                  top: `${balloon.y}%`,
                  animationDelay: `${balloon.id * 0.2}s`,
                }}
                data-testid={`balloon-${balloon.id}`}
              >
                <div className={`
                  w-20 h-24 md:w-24 md:h-28 rounded-full bg-gradient-to-br ${balloon.color}
                  flex items-center justify-center p-2 shadow-lg
                  relative
                `}>
                  <span className="text-white text-xs md:text-sm font-medium text-center leading-tight">
                    {balloon.content}
                  </span>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-white/50" />
                </div>
              </button>
            ))}
          </div>

          {feedback && (
            <Card className={`p-4 text-center max-w-md animate-in fade-in zoom-in ${feedback.correct ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {feedback.correct ? (
                  <>
                    <Check className="h-6 w-6 text-emerald-500" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Correct! +10 points</span>
                  </>
                ) : (
                  <>
                    <X className="h-6 w-6 text-rose-500" />
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      The answer was: {feedback.answer}
                    </span>
                  </>
                )}
              </div>
              <Button onClick={nextQuestion} className="mt-2" data-testid="button-next">
                {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
              </Button>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-8 text-center bg-gradient-to-r from-primary/10 to-accent/10 animate-in fade-in zoom-in">
          <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Game Complete!</h3>
          <p className="text-3xl font-bold text-primary mb-4">{score} points</p>
          <Button onClick={resetGame} size="lg" data-testid="button-play-again">
            Play Again
          </Button>
        </Card>
      )}
    </div>
  );
}
