import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Gamepad2 } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

const gameTypes = [
  { id: "luckySpinner", name: "Lucky Spinner", icon: "🎡", description: "Spin the wheel for questions" },
  { id: "mysteryBox", name: "Mystery Box", icon: "📦", description: "Tap boxes to reveal challenges" },
  { id: "memoryMatch", name: "Memory Match", icon: "🃏", description: "Find matching pairs" },
  { id: "quickCatch", name: "Quick Catch", icon: "🎯", description: "Tap correct answers fast" },
  { id: "factOrFib", name: "Fact or Fib", icon: "✅", description: "True or false quiz" },
  { id: "wordHunt", name: "Word Hunt", icon: "🔍", description: "Find hidden words" },
  { id: "letterRescue", name: "Letter Rescue", icon: "🔤", description: "Guess the word" },
  { id: "treasureChest", name: "Treasure Chest", icon: "💎", description: "Open chests for rewards" },
  { id: "letterScramble", name: "Letter Scramble", icon: "🔀", description: "Unscramble words" },
  { id: "popAndLearn", name: "Pop & Learn", icon: "🎈", description: "Pop correct balloons" },
  { id: "brainBattle", name: "Brain Battle", icon: "🧠", description: "Quiz competition" },
  { id: "missingPiece", name: "Missing Piece", icon: "✏️", description: "Fill in the blanks" },
];

export function GamesLauncher() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const handleSelectGame = (gameId: string) => {
    setOpen(false);
    setLocation(`/home?type=activity&game=${gameId}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-games-launcher">
          <Gamepad2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            {t("contentTypes.activity", "Online Games")}
          </DialogTitle>
          <DialogDescription>
            Choose a game type to create an interactive classroom game
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {gameTypes.map((game) => (
            <Button
              key={game.id}
              variant="outline"
              className="h-auto py-3 px-4 flex flex-col items-start text-left"
              onClick={() => handleSelectGame(game.id)}
              data-testid={`button-game-${game.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{game.icon}</span>
                <span className="font-medium text-sm">{game.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{game.description}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
