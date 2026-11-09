import { Button } from "@/components/ui/button";
import { Gamepad2 } from "lucide-react";
import { useLocation } from "wouter";

export function GamesLauncher() {
  const [, setLocation] = useLocation();

  return (
    <Button 
      variant="ghost" 
      size="sm"
      aria-label="Games"
      onClick={() => setLocation("/games")}
      data-testid="button-games-launcher"
    >
      <Gamepad2 className="h-4 w-4 mr-2" />Games
    </Button>
  );
}
