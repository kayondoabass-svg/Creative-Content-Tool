import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Volume2, VolumeX, RotateCcw, Plus, Trash2, Shuffle, Settings, X, Trophy } from "lucide-react";

interface SpinnerSegment {
  text: string;
  challenge?: string;
  points?: number;
}

interface LuckySpinnerProps {
  segments: SpinnerSegment[];
  title: string;
}

const COLOR_THEMES = {
  default: ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#6366F1", "#14B8A6", "#F97316", "#84CC16", "#A855F7", "#3B82F6"],
  rainbow: ["#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981", "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#EC4899", "#F43F5E"],
  ocean: ["#0EA5E9", "#06B6D4", "#14B8A6", "#10B981", "#22C55E", "#3B82F6", "#6366F1", "#0284C7", "#0891B2", "#059669", "#0D9488", "#2563EB"],
  sunset: ["#F97316", "#FB923C", "#FBBF24", "#EF4444", "#F43F5E", "#EC4899", "#F472B6", "#FCD34D", "#DC2626", "#E11D48", "#BE185D", "#EA580C"],
  forest: ["#10B981", "#059669", "#22C55E", "#16A34A", "#84CC16", "#65A30D", "#4ADE80", "#34D399", "#15803D", "#166534", "#14532D", "#22D3EE"],
};

export function LuckySpinner({ segments: initialSegments, title }: LuckySpinnerProps) {
  const [entries, setEntries] = useState<SpinnerSegment[]>(initialSegments);
  const [baselineEntries, setBaselineEntries] = useState<SpinnerSegment[]>(initialSegments);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<SpinnerSegment | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(50);
  const [spinTime, setSpinTime] = useState(10);
  const [showSettings, setShowSettings] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const [colorTheme, setColorTheme] = useState<keyof typeof COLOR_THEMES>("default");
  const [removedCount, setRemovedCount] = useState(0);
  const tickAudioRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
      if (tickAudioRef.current) {
        try {
          tickAudioRef.current.close();
        } catch (e) {
          // Ignore audio context close errors
        }
      }
    };
  }, []);

  const COLORS = COLOR_THEMES[colorTheme];

  const playTickSound = () => {
    if (!soundEnabled || volume === 0) return;
    try {
      if (!tickAudioRef.current) {
        tickAudioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = tickAudioRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = volume / 200;
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.log("Audio not available");
    }
  };

  const spinWheel = () => {
    if (isSpinning || entries.length === 0) return;
    
    setIsSpinning(true);
    setSelectedSegment(null);
    setShowWinnerModal(false);
    
    const spins = 5 + Math.random() * 5;
    const extraDegrees = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + extraDegrees;
    
    setRotation(totalRotation);
    
    // Clear any existing interval/timeout
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
    }
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }
    
    tickIntervalRef.current = setInterval(() => {
      playTickSound();
    }, 100);
    
    // Store the current entries for the callback
    const currentEntries = [...entries];
    
    spinTimeoutRef.current = setTimeout(() => {
      // Clear tick interval
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      spinTimeoutRef.current = null;
      
      // Only update state if still mounted
      if (!mountedRef.current) return;
      
      const normalizedRotation = totalRotation % 360;
      const segmentAngle = 360 / currentEntries.length;
      const pointerOffset = 90;
      const adjustedRotation = (360 - normalizedRotation + pointerOffset) % 360;
      const selectedIndex = Math.floor(adjustedRotation / segmentAngle) % currentEntries.length;
      
      setSelectedSegment(currentEntries[selectedIndex]);
      setShowWinnerModal(true);
      setIsSpinning(false);
    }, spinTime * 1000);
  };

  const addEntry = () => {
    if (newEntry.trim()) {
      const newItem = { text: newEntry.trim() };
      setEntries([...entries, newItem]);
      setBaselineEntries([...baselineEntries, newItem]);
      setNewEntry("");
    }
  };

  const removeEntry = (index: number) => {
    setRemovedCount(prev => prev + 1);
    setEntries(entries.filter((_, i) => i !== index));
  };

  const removeWinner = () => {
    if (selectedSegment) {
      const index = entries.findIndex(e => e.text === selectedSegment.text);
      if (index !== -1) {
        removeEntry(index);
      }
      setShowWinnerModal(false);
      setSelectedSegment(null);
    }
  };

  const shuffleEntries = () => {
    const shuffled = [...entries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setEntries(shuffled);
  };

  const resetAll = () => {
    // Restore to baseline entries (includes user-added entries)
    setEntries([...baselineEntries]);
    setRemovedCount(0);
    setRotation(0);
    setSelectedSegment(null);
    setShowWinnerModal(false);
    setIsSpinning(false);
    
    // Clear any running interval/timeout
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
  };

  const segmentAngle = entries.length > 0 ? 360 / entries.length : 360;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 min-h-[600px]">
      {/* Main Wheel Area */}
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <h2 className="text-2xl font-bold text-center">{title}</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              data-testid="button-sound-toggle"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              data-testid="button-settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {entries.length > 0 ? (
          <>
            <div className="relative">
              {/* Pointer */}
              <div 
                className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 w-0 h-0"
                style={{
                  borderLeft: "20px solid transparent",
                  borderRight: "20px solid transparent",
                  borderTop: `30px solid ${COLORS[0]}`,
                }}
              />
              
              {/* Wheel */}
              <div 
                className="relative w-[280px] h-[280px] md:w-[380px] md:h-[380px] rounded-full overflow-hidden shadow-2xl border-4 border-primary cursor-pointer"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? `transform ${spinTime}s cubic-bezier(0.17, 0.67, 0.12, 0.99)` : "none",
                }}
                onClick={!isSpinning ? spinWheel : undefined}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {entries.map((segment, index) => {
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
                          fontSize={entries.length > 10 ? "2.5" : entries.length > 6 ? "3.5" : "4"}
                          fontWeight="bold"
                          transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                          className="pointer-events-none"
                        >
                          {segment.text.length > 10 ? segment.text.slice(0, 8) + "..." : segment.text}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="50" cy="50" r="8" fill="white" stroke={COLORS[0]} strokeWidth="2" />
                </svg>
              </div>
              
              {/* Click to spin text */}
              {!isSpinning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/95 dark:bg-gray-900/95 rounded-full px-3 py-1 text-xs font-medium text-gray-900 dark:text-gray-100 shadow-md">
                    Click to spin
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap justify-center">
              <Button
                size="lg"
                onClick={spinWheel}
                disabled={isSpinning || entries.length === 0}
                className="text-lg px-8"
                data-testid="button-spin"
              >
                {isSpinning ? "Spinning..." : "SPIN!"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={resetAll}
                disabled={isSpinning}
                data-testid="button-reset"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Add entries to the wheel to get started</p>
              <p className="text-sm text-muted-foreground">Use the panel on the right to add names</p>
            </Card>
          </div>
        )}
      </div>

      {/* Entries Panel */}
      <Card className="w-full lg:w-80 shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Entries ({entries.length})</span>
            {removedCount > 0 && (
              <span className="text-xs text-muted-foreground">
                Removed: {removedCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a name..."
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addEntry()}
              data-testid="input-new-entry"
            />
            <Button size="icon" onClick={addEntry} data-testid="button-add-entry">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={shuffleEntries} className="flex-1" data-testid="button-shuffle">
              <Shuffle className="h-4 w-4 mr-1" />
              Shuffle
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {entries.map((entry, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 p-2 hover-elevate"
              >
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="flex-1 text-sm truncate">{entry.text}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEntry(index)}
                  data-testid={`button-remove-entry-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Winner Modal */}
      <Dialog open={showWinnerModal} onOpenChange={setShowWinnerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl justify-center">
              <Trophy className="h-8 w-8 text-yellow-500" />
              We have a winner!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div 
              className="text-4xl font-bold mb-4"
              style={{ color: COLORS[0] }}
            >
              {selectedSegment?.text}
            </div>
            {selectedSegment?.challenge && (
              <p className="text-muted-foreground">{selectedSegment.challenge}</p>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setShowWinnerModal(false)} data-testid="button-close-winner">
              Close
            </Button>
            <Button variant="destructive" onClick={removeWinner} data-testid="button-remove-winner">
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Wheel</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Volume: {volume}%</Label>
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                max={100}
                step={1}
                data-testid="slider-volume"
              />
            </div>

            <div className="space-y-2">
              <Label>Spin Time: {spinTime} seconds</Label>
              <Slider
                value={[spinTime]}
                onValueChange={([v]) => setSpinTime(v)}
                min={3}
                max={20}
                step={1}
                data-testid="slider-spin-time"
              />
            </div>

            <div className="space-y-2">
              <Label>Color Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(COLOR_THEMES) as Array<keyof typeof COLOR_THEMES>).map((theme) => (
                  <Button
                    key={theme}
                    variant={colorTheme === theme ? "default" : "outline"}
                    size="sm"
                    onClick={() => setColorTheme(theme)}
                    className="capitalize"
                    data-testid={`button-theme-${theme}`}
                  >
                    {theme}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1 mt-2">
                {COLOR_THEMES[colorTheme].slice(0, 6).map((color, i) => (
                  <div 
                    key={i} 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
