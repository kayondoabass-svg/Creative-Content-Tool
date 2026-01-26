import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Maximize2, Minimize2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import type { GameType } from "@shared/schema";
import {
  LuckySpinner,
  MysteryBox,
  MemoryMatch,
  FactOrFib,
  BrainBattle,
  LetterScramble,
  MissingPiece,
  PopAndLearn,
  TreasureChest,
  WordHunt,
  LetterRescue,
  QuickCatch,
} from "./games";

interface GamePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: GameType;
  gameData: any;
  title: string;
}

export function GamePlayerModal({ isOpen, onClose, gameType, gameData, title }: GamePlayerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.log("Fullscreen not available");
    }
  };

  const hasGameData = () => {
    switch (gameType) {
      case "luckySpinner":
        return gameData.wheelSegments?.length > 0;
      case "mysteryBox":
        return gameData.boxes?.length > 0;
      case "memoryMatch":
        return gameData.pairs?.length > 0;
      case "factOrFib":
        return gameData.statements?.length > 0;
      case "brainBattle":
        return gameData.questions?.length > 0;
      case "letterScramble":
        return gameData.words?.length > 0;
      case "missingPiece":
        return gameData.blanks?.length > 0;
      case "popAndLearn":
        return gameData.popQuestions?.length > 0;
      case "treasureChest":
        return gameData.chests?.length > 0;
      case "wordHunt":
        return gameData.searchWords?.length > 0;
      case "letterRescue":
        return gameData.rescueWords?.length > 0;
      case "quickCatch":
        return gameData.catchItems?.correct?.length > 0;
      default:
        return false;
    }
  };

  const renderGame = () => {
    if (!hasGameData()) {
      return (
        <Card className="p-8 text-center max-w-md mx-auto mt-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Game Data Not Available</h3>
          <p className="text-muted-foreground">
            The generated content doesn't have enough data to play this game. 
            Try regenerating the content.
          </p>
        </Card>
      );
    }

    switch (gameType) {
      case "luckySpinner":
        return <LuckySpinner segments={gameData.wheelSegments || []} title={title} />;
      
      case "mysteryBox":
        return <MysteryBox boxes={gameData.boxes || []} title={title} />;
      
      case "memoryMatch":
        return <MemoryMatch pairs={gameData.pairs || []} title={title} />;
      
      case "factOrFib":
        return <FactOrFib statements={gameData.statements || []} title={title} />;
      
      case "brainBattle":
        return <BrainBattle questions={gameData.questions || []} title={title} />;
      
      case "letterScramble":
        return <LetterScramble words={gameData.words || []} title={title} />;
      
      case "missingPiece":
        return <MissingPiece blanks={gameData.blanks || []} title={title} />;
      
      case "popAndLearn":
        return <PopAndLearn questions={gameData.popQuestions || []} title={title} />;
      
      case "treasureChest":
        return <TreasureChest chests={gameData.chests || []} title={title} />;
      
      case "wordHunt":
        return <WordHunt words={gameData.searchWords || []} title={title} />;
      
      case "letterRescue":
        return <LetterRescue words={gameData.rescueWords || []} title={title} />;
      
      case "quickCatch":
        return (
          <QuickCatch 
            correctItems={gameData.catchItems?.correct || []} 
            incorrectItems={gameData.catchItems?.incorrect || []}
            title={title}
            instruction={gameData.catchItems?.instruction}
          />
        );
      
      default:
        return (
          <Card className="p-8 text-center max-w-md mx-auto mt-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Game Type Not Supported</h3>
            <p className="text-muted-foreground">This game type is not yet available.</p>
          </Card>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden" hideCloseButton>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
            <h2 className="text-lg font-bold truncate">{title}</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} data-testid="button-fullscreen">
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-game">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto bg-background">
            {renderGame()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
