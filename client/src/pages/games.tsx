import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GamePlayerModal } from "@/components/game-player-modal";
import { 
  ArrowLeft, 
  CircleDot, 
  Package, 
  Layers, 
  Target, 
  CheckCircle, 
  Search, 
  Type, 
  Gift, 
  Shuffle, 
  Circle, 
  Brain, 
  PenTool,
  type LucideIcon
} from "lucide-react";
import { useLocation } from "wouter";
import type { GameType } from "@shared/schema";

const sampleGameData: Record<GameType, { title: string; data: any }> = {
  luckySpinner: {
    title: "Math Vocabulary Spinner",
    data: {
      wheelSegments: [
        { text: "Addition", challenge: "What is 7 + 8?", points: 10 },
        { text: "Subtraction", challenge: "What is 15 - 9?", points: 10 },
        { text: "Multiply", challenge: "What is 6 × 4?", points: 15 },
        { text: "Division", challenge: "What is 20 ÷ 5?", points: 15 },
        { text: "Fractions", challenge: "What is 1/2 + 1/4?", points: 20 },
        { text: "Decimals", challenge: "What is 0.5 + 0.25?", points: 20 },
        { text: "Geometry", challenge: "Name a shape with 6 sides", points: 10 },
        { text: "Patterns", challenge: "What comes next: 2, 4, 6, ?", points: 10 },
      ],
    },
  },
  mysteryBox: {
    title: "Science Discovery Boxes",
    data: {
      boxes: [
        { number: 1, question: "What planet is closest to the Sun?", answer: "Mercury", points: 10 },
        { number: 2, question: "What gas do plants breathe in?", answer: "Carbon Dioxide", points: 10 },
        { number: 3, question: "How many legs does a spider have?", answer: "8", points: 10 },
        { number: 4, question: "What is the largest organ in the body?", answer: "Skin", points: 15 },
        { number: 5, question: "What do we call frozen water?", answer: "Ice", points: 10 },
        { number: 6, question: "What animal is known as man's best friend?", answer: "Dog", points: 10 },
        { number: 7, question: "What is the boiling point of water?", answer: "100°C / 212°F", points: 15 },
        { number: 8, question: "What force keeps us on the ground?", answer: "Gravity", points: 15 },
        { number: 9, question: "What do caterpillars turn into?", answer: "Butterflies", points: 10 },
        { number: 10, question: "What is H2O?", answer: "Water", points: 10 },
        { number: 11, question: "What is the fastest land animal?", answer: "Cheetah", points: 15 },
        { number: 12, question: "What planet has rings around it?", answer: "Saturn", points: 15 },
      ],
    },
  },
  memoryMatch: {
    title: "Animal Match Game",
    data: {
      pairs: [
        { term: "Dog", match: "Bark" },
        { term: "Cat", match: "Meow" },
        { term: "Cow", match: "Moo" },
        { term: "Lion", match: "Roar" },
        { term: "Bird", match: "Tweet" },
        { term: "Duck", match: "Quack" },
      ],
    },
  },
  quickCatch: {
    title: "Catch the Fruits!",
    data: {
      catchItems: {
        instruction: "Tap only the FRUITS!",
        correct: ["Apple", "Banana", "Orange", "Grapes", "Mango", "Strawberry"],
        incorrect: ["Carrot", "Broccoli", "Potato", "Onion", "Lettuce", "Celery"],
      },
    },
  },
  factOrFib: {
    title: "True or False Challenge",
    data: {
      statements: [
        { statement: "The Earth is round", isTrue: true, explanation: "The Earth is a sphere!" },
        { statement: "Fish can fly", isTrue: false, explanation: "Fish swim in water, they cannot fly" },
        { statement: "The Sun rises in the East", isTrue: true, explanation: "The Sun always rises in the East" },
        { statement: "Penguins live in the desert", isTrue: false, explanation: "Penguins live in cold climates" },
        { statement: "Water freezes at 0°C", isTrue: true, explanation: "Water turns to ice at 0°C or 32°F" },
        { statement: "Spiders have 6 legs", isTrue: false, explanation: "Spiders have 8 legs" },
        { statement: "The Moon orbits the Earth", isTrue: true, explanation: "The Moon goes around our planet!" },
        { statement: "Elephants are smaller than mice", isTrue: false, explanation: "Elephants are much larger!" },
      ],
    },
  },
  wordHunt: {
    title: "Color Word Search",
    data: {
      searchWords: ["RED", "BLUE", "GREEN", "YELLOW", "ORANGE", "PURPLE", "PINK", "BLACK"],
    },
  },
  letterRescue: {
    title: "Animal Rescue",
    data: {
      rescueWords: [
        { word: "ELEPHANT", hint: "Largest land animal with a trunk", category: "Animals" },
        { word: "GIRAFFE", hint: "Tallest animal with a long neck", category: "Animals" },
        { word: "PENGUIN", hint: "Bird that cannot fly but swims", category: "Animals" },
        { word: "DOLPHIN", hint: "Smart sea creature that jumps", category: "Animals" },
        { word: "BUTTERFLY", hint: "Colorful insect with wings", category: "Animals" },
        { word: "KANGAROO", hint: "Animal that hops and has a pouch", category: "Animals" },
      ],
    },
  },
  treasureChest: {
    title: "Knowledge Treasure Hunt",
    data: {
      chests: [
        { id: 1, challenge: "Name 3 primary colors", reward: "Gold coins!", points: 10 },
        { id: 2, challenge: "Count to 10 in another language", reward: "Diamond!", points: 15 },
        { id: 3, challenge: "Name the 4 seasons", reward: "Ruby gem!", points: 10 },
        { id: 4, challenge: "Spell your name backwards", reward: "Emerald!", points: 10 },
        { id: 5, challenge: "Name 5 fruits", reward: "Treasure map!", points: 10 },
        { id: 6, challenge: "What is 7 × 8?", reward: "Crown!", points: 15 },
        { id: 7, challenge: "Name 3 oceans", reward: "Pearls!", points: 15 },
        { id: 8, challenge: "What year is it?", reward: "Silver coins!", points: 10 },
        { id: 9, challenge: "Name 4 shapes", reward: "Treasure chest!", points: 10 },
      ],
    },
  },
  letterScramble: {
    title: "Scrambled Animals",
    data: {
      words: [
        { word: "TIGER", hint: "Striped big cat", points: 10 },
        { word: "HORSE", hint: "Animal you can ride", points: 10 },
        { word: "RABBIT", hint: "Has long ears and hops", points: 10 },
        { word: "MONKEY", hint: "Swings from trees", points: 10 },
        { word: "ZEBRA", hint: "Black and white stripes", points: 15 },
        { word: "PARROT", hint: "Colorful bird that talks", points: 15 },
        { word: "TURTLE", hint: "Slow animal with a shell", points: 10 },
        { word: "SHARK", hint: "Big fish with sharp teeth", points: 15 },
      ],
    },
  },
  popAndLearn: {
    title: "Math Pop Quiz",
    data: {
      popQuestions: [
        { question: "What is 5 + 3?", answer: "8", options: ["6", "7", "8", "9"] },
        { question: "What is 10 - 4?", answer: "6", options: ["5", "6", "7", "8"] },
        { question: "What is 3 × 3?", answer: "9", options: ["6", "8", "9", "12"] },
        { question: "What is 12 ÷ 3?", answer: "4", options: ["3", "4", "5", "6"] },
        { question: "What is 7 + 5?", answer: "12", options: ["10", "11", "12", "13"] },
        { question: "What is 15 - 8?", answer: "7", options: ["6", "7", "8", "9"] },
      ],
    },
  },
  brainBattle: {
    title: "General Knowledge Quiz",
    data: {
      questions: [
        { question: "What color is the sky on a clear day?", options: ["Red", "Green", "Blue", "Yellow"], correctIndex: 2, points: 10, explanation: "The sky appears blue!" },
        { question: "How many days are in a week?", options: ["5", "6", "7", "8"], correctIndex: 2, points: 10, explanation: "There are 7 days in a week" },
        { question: "What do bees make?", options: ["Milk", "Honey", "Bread", "Cheese"], correctIndex: 1, points: 10, explanation: "Bees make honey!" },
        { question: "Which animal says 'Moo'?", options: ["Dog", "Cat", "Cow", "Pig"], correctIndex: 2, points: 10, explanation: "Cows say Moo!" },
        { question: "What shape has 3 sides?", options: ["Square", "Circle", "Triangle", "Rectangle"], correctIndex: 2, points: 15, explanation: "Triangles have 3 sides" },
        { question: "What is the largest animal?", options: ["Elephant", "Blue Whale", "Giraffe", "Lion"], correctIndex: 1, points: 15, explanation: "Blue whales are the largest!" },
        { question: "How many months in a year?", options: ["10", "11", "12", "13"], correctIndex: 2, points: 10, explanation: "There are 12 months" },
        { question: "What do plants need to grow?", options: ["Candy", "Water", "Toys", "Books"], correctIndex: 1, points: 10, explanation: "Plants need water to grow" },
      ],
    },
  },
  missingPiece: {
    title: "Fill in the Blank",
    data: {
      blanks: [
        { sentence: "The ___ shines during the day.", blank: "sun", hint: "It's bright and yellow" },
        { sentence: "We use our ___ to see.", blank: "eyes", hint: "You have two of them" },
        { sentence: "Birds can ___ in the sky.", blank: "fly", hint: "Moving through the air" },
        { sentence: "Fish live in ___.", blank: "water", hint: "H2O" },
        { sentence: "We breathe with our ___.", blank: "lungs", hint: "Inside your chest" },
        { sentence: "The ___ gives us light at night.", blank: "moon", hint: "It goes around Earth" },
        { sentence: "Rain falls from ___.", blank: "clouds", hint: "White fluffy things in the sky" },
        { sentence: "We use a ___ to write.", blank: "pencil", hint: "Made of wood with graphite" },
      ],
    },
  },
};

const gameCards: { id: GameType; name: string; Icon: LucideIcon; color: string }[] = [
  { id: "luckySpinner", name: "Lucky Spinner", Icon: CircleDot, color: "from-purple-500 to-purple-600" },
  { id: "mysteryBox", name: "Mystery Box", Icon: Package, color: "from-amber-500 to-orange-500" },
  { id: "memoryMatch", name: "Memory Match", Icon: Layers, color: "from-blue-500 to-cyan-500" },
  { id: "quickCatch", name: "Quick Catch", Icon: Target, color: "from-red-500 to-pink-500" },
  { id: "factOrFib", name: "Fact or Fib", Icon: CheckCircle, color: "from-green-500 to-emerald-500" },
  { id: "wordHunt", name: "Word Hunt", Icon: Search, color: "from-indigo-500 to-blue-500" },
  { id: "letterRescue", name: "Letter Rescue", Icon: Type, color: "from-teal-500 to-cyan-500" },
  { id: "treasureChest", name: "Treasure Chest", Icon: Gift, color: "from-yellow-500 to-amber-500" },
  { id: "letterScramble", name: "Letter Scramble", Icon: Shuffle, color: "from-fuchsia-500 to-purple-500" },
  { id: "popAndLearn", name: "Pop & Learn", Icon: Circle, color: "from-rose-500 to-red-500" },
  { id: "brainBattle", name: "Brain Battle", Icon: Brain, color: "from-violet-500 to-indigo-500" },
  { id: "missingPiece", name: "Missing Piece", Icon: PenTool, color: "from-slate-500 to-gray-600" },
];

export default function GamesPage() {
  const [, setLocation] = useLocation();
  const [activeGame, setActiveGame] = useState<GameType | null>(null);

  const handlePlayGame = (gameId: GameType) => {
    setActiveGame(gameId);
  };

  const handleCloseGame = () => {
    setActiveGame(null);
  };

  const activeGameData = activeGame ? sampleGameData[activeGame] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Play Games
            </h1>
            <p className="text-muted-foreground">Tap any game to start playing!</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gameCards.map((game) => (
            <Card
              key={game.id}
              className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300"
              onClick={() => handlePlayGame(game.id)}
              data-testid={`game-card-${game.id}`}
            >
              <div className={`h-24 bg-gradient-to-br ${game.color} flex items-center justify-center`}>
                <game.Icon className="h-12 w-12 text-white group-hover:scale-110 transition-transform" />
              </div>
              <div className="p-4 text-center">
                <h3 className="font-bold text-lg">{game.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Tap to play!</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {activeGame && activeGameData && (
        <GamePlayerModal
          isOpen={true}
          onClose={handleCloseGame}
          gameType={activeGame}
          gameData={activeGameData.data}
          title={activeGameData.title}
        />
      )}
    </div>
  );
}
