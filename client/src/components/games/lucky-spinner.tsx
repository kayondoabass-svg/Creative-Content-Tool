import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";

interface SpinnerSegment {
  text: string;
  challenge?: string;
  points?: number;
}

interface LuckySpinnerProps {
  segments: SpinnerSegment[];
  title: string;
}

const COLORS = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", 
  "#EF4444", "#EC4899", "#6366F1", "#14B8A6",
  "#F97316", "#84CC16", "#A855F7", "#3B82F6"
];

export function LuckySpinner({ segments, title }: LuckySpinnerProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<SpinnerSegment | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);

  const spinWheel = () => {
    if (isSpinning || segments.length === 0) return;
    
    setIsSpinning(true);
    setSelectedSegment(null);
    
    const spins = 5 + Math.random() * 5;
    const extraDegrees = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + extraDegrees;
    
    setRotation(totalRotation);
    
    setTimeout(() => {
      const normalizedRotation = totalRotation % 360;
      const segmentAngle = 360 / segments.length;
      const pointerOffset = 90;
      const adjustedRotation = (360 - normalizedRotation + pointerOffset) % 360;
      const selectedIndex = Math.floor(adjustedRotation / segmentAngle) % segments.length;
      
      setSelectedSegment(segments[selectedIndex]);
      setIsSpinning(false);
    }, 4000);
  };

  const resetGame = () => {
    setRotation(0);
    setSelectedSegment(null);
    setIsSpinning(false);
  };

  const segmentAngle = 360 / segments.length;

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-center">{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          data-testid="button-sound-toggle"
        >
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
      </div>

      <div className="relative">
        <div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 w-0 h-0"
          style={{
            borderLeft: "20px solid transparent",
            borderRight: "20px solid transparent",
            borderTop: "30px solid #8B5CF6",
          }}
        />
        
        <div 
          className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full overflow-hidden shadow-2xl border-4 border-primary"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {segments.map((segment, index) => {
              const startAngle = index * segmentAngle;
              const endAngle = startAngle + segmentAngle;
              const startRad = (startAngle - 90) * (Math.PI / 180);
              const endRad = (endAngle - 90) * (Math.PI / 180);
              
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              
              const largeArc = segmentAngle > 180 ? 1 : 0;
              
              const midAngle = (startAngle + endAngle) / 2 - 90;
              const midRad = midAngle * (Math.PI / 180);
              const textX = 50 + 32 * Math.cos(midRad);
              const textY = 50 + 32 * Math.sin(midRad);
              
              return (
                <g key={index}>
                  <path
                    d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="white"
                    strokeWidth="0.5"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={segments.length > 8 ? "3" : "4"}
                    fontWeight="bold"
                    transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    className="pointer-events-none"
                  >
                    {segment.text.length > 12 ? segment.text.slice(0, 10) + "..." : segment.text}
                  </text>
                </g>
              );
            })}
            <circle cx="50" cy="50" r="8" fill="white" stroke="#8B5CF6" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          size="lg"
          onClick={spinWheel}
          disabled={isSpinning}
          className="text-lg px-8"
          data-testid="button-spin"
        >
          {isSpinning ? "Spinning..." : "SPIN!"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={resetGame}
          disabled={isSpinning}
          data-testid="button-reset"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {selectedSegment && (
        <Card className="p-6 text-center max-w-md animate-in fade-in zoom-in duration-300">
          <h3 className="text-xl font-bold text-primary mb-2">{selectedSegment.text}</h3>
          {selectedSegment.challenge && (
            <p className="text-muted-foreground">{selectedSegment.challenge}</p>
          )}
          {selectedSegment.points !== undefined && (
            <p className="mt-2 text-lg font-semibold text-accent">+{selectedSegment.points} points</p>
          )}
        </Card>
      )}
    </div>
  );
}
